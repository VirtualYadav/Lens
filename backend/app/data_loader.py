"""
data_loader.py — Lens edition
Handles CSV, multi-sheet Excel, and SQLite files.
"""

import duckdb
import pandas as pd
import sqlite3
import os
import re

_con = duckdb.connect(":memory:")

SUPPORTED_EXTS = {"csv", "xlsx", "xls", "db", "sqlite", "sqlite3"}
UNSAFE_NAME = re.compile(r"[^a-zA-Z0-9_]")


def _safe_name(name: str) -> str:
    cleaned = UNSAFE_NAME.sub("_", name)
    if cleaned and cleaned[0].isdigit():
        cleaned = "t_" + cleaned
    return cleaned or "unnamed"


def load_file(file_path: str, dataset_id: str) -> dict:
    ext = file_path.lower().rsplit(".", 1)[-1]
    if ext not in SUPPORTED_EXTS:
        raise ValueError(f"Unsupported file type: .{ext}")

    if ext == "csv":
        tables = _load_csv(file_path, dataset_id)
    elif ext in ("xlsx", "xls"):
        tables = _load_excel(file_path, dataset_id)
    else:
        tables = _load_sqlite(file_path, dataset_id)

    if not tables:
        raise ValueError("No tables could be extracted from this file")

    return {"tables": tables}


def _load_csv(file_path: str, dataset_id: str) -> list[dict]:
    table_name = f"data_{_safe_name(dataset_id)}"
    _con.execute(
        f'CREATE OR REPLACE VIEW "{table_name}" AS '
        f"SELECT * FROM read_csv_auto('{file_path}', header=true, "
        f"sample_size=-1, all_varchar=false)"
    )
    info = _table_info(table_name)
    return [{
        "name": table_name,
        "original_name": "data",
        "rows": info["rows"],
        "columns": info["columns"],
    }]


def _load_excel(file_path: str, dataset_id: str) -> list[dict]:
    xls = pd.ExcelFile(file_path)
    tables = []
    for sheet_name in xls.sheet_names:
        df = xls.parse(sheet_name)
        if df.empty:
            continue
        df.columns = [_safe_name(str(c)) for c in df.columns]
        safe_sheet = _safe_name(sheet_name)
        table_name = f"data_{_safe_name(dataset_id)}__{safe_sheet}"
        _con.register(table_name, df)
        _con.execute(
            f'CREATE OR REPLACE VIEW "{table_name}" AS SELECT * FROM "{table_name}"'
        )
        info = _table_info(table_name)
        tables.append({
            "name": table_name,
            "original_name": sheet_name,
            "rows": info["rows"],
            "columns": info["columns"],
        })
    return tables


def _load_sqlite(file_path: str, dataset_id: str) -> list[dict]:
    with sqlite3.connect(file_path) as sconn:
        cur = sconn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        sqlite_tables = [row[0] for row in cur.fetchall()]

    if not sqlite_tables:
        raise ValueError("SQLite file contains no tables")

    attach_name = f"sqlite_{_safe_name(dataset_id)}"
    _con.execute(f"DETACH DATABASE IF EXISTS \"{attach_name}\"")
    _con.execute(f"ATTACH '{file_path}' AS \"{attach_name}\" (TYPE SQLITE, READ_ONLY)")

    tables = []
    for sqlite_tname in sqlite_tables:
        safe_tname = _safe_name(sqlite_tname)
        view_name = f"data_{_safe_name(dataset_id)}__{safe_tname}"
        _con.execute(
            f'CREATE OR REPLACE VIEW "{view_name}" AS '
            f'SELECT * FROM "{attach_name}"."{sqlite_tname}"'
        )
        info = _table_info(view_name)
        if info["rows"] == 0 and not info["columns"]:
            continue
        tables.append({
            "name": view_name,
            "original_name": sqlite_tname,
            "rows": info["rows"],
            "columns": info["columns"],
        })

    _con.execute(f"DETACH DATABASE \"{attach_name}\"")
    return tables


def _table_info(table_name: str) -> dict:
    try:
        rows = _con.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()[0]
        cols_rows = _con.execute(f'DESCRIBE "{table_name}"').fetchall()
        return {"rows": rows, "columns": [r[0] for r in cols_rows]}
    except Exception:
        return {"rows": 0, "columns": []}


def get_schema(dataset_id: str, tables: list[dict]) -> list[dict]:
    full_schema = []
    for tbl in tables:
        rows = _con.execute(f'DESCRIBE "{tbl["name"]}"').fetchall()
        for col_name, col_type, *_ in rows:
            samples = _con.execute(
                f'SELECT DISTINCT "{col_name}" FROM "{tbl["name"]}" '
                f'WHERE "{col_name}" IS NOT NULL LIMIT 3'
            ).fetchall()
            full_schema.append({
                "table": tbl["original_name"],
                "table_sql": tbl["name"],
                "name": col_name,
                "type": col_type,
                "samples": [str(s[0]) for s in samples],
            })
    return full_schema


def query_dataset(dataset_id: str, sql: str) -> dict:
    result = _con.execute(sql).fetchdf()
    result = result.where(pd.notnull(result), None)
    return {
        "columns": list(result.columns),
        "rows": result.values.tolist(),
        "row_count": len(result),
    }


def cleanup_dataset(dataset_id: str) -> None:
    safe = _safe_name(dataset_id)
    rows = _con.execute(
        "SELECT table_name FROM information_schema.views WHERE table_schema = 'main'"
    ).fetchall()
    for (view_name,) in rows:
        if view_name.startswith(f"data_{safe}"):
            try:
                _con.execute(f'DROP VIEW IF EXISTS "{view_name}"')
            except Exception:
                pass
    try:
        _con.unregister(f"data_{safe}")
    except Exception:
        pass

    upload_dir = f"/tmp/lens/{dataset_id}"
    if os.path.exists(upload_dir):
        for f in os.listdir(upload_dir):
            try:
                os.remove(f"{upload_dir}/{f}")
            except Exception:
                pass
        try:
            os.rmdir(upload_dir)
        except Exception:
            pass
