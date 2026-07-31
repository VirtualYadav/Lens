"""
Lens — Backend entry point
A unique AI data analysis tool. Not a clone of anything.

Differences from typical "chat with your data" tools:
  - Multilingual (responds in the same language the user writes in)
  - Generates "insight" cards (one-line plain-English findings)
  - Suggests follow-up questions proactively
  - Sends the user's language preference to the LLM
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid
import os
import logging

from app.data_loader import (
    load_file, get_schema, query_dataset, cleanup_dataset, SUPPORTED_EXTS
)
from app.query import run_query_with_insights

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Lens API",
    description="Look closer at your data",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATASETS: dict[str, dict] = {}
CONVERSATIONS: dict[str, list[dict]] = {}


class QueryRequest(BaseModel):
    dataset_id: str
    question: str
    table: Optional[str] = None
    language: Optional[str] = "en"  # BCP-47, e.g. "en", "hi", "es", "fr"
    conversation_id: Optional[str] = None


class QueryResponse(BaseModel):
    sql: str
    explanation: str
    insight: str  # one-line plain-English finding
    follow_ups: list[str]  # 2-3 suggested next questions
    columns: list[str]
    rows: list[list]
    chart: Optional[dict] = None
    used_table: str


class TableInfo(BaseModel):
    name: str
    original_name: str
    rows: int
    columns: list[str]


class DatasetInfo(BaseModel):
    dataset_id: str
    filename: str
    file_type: str
    tables: list[TableInfo]
    schema_info: list[dict]
    primary_table: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "lens", "version": "1.0.0"}


@app.get("/supported-formats")
def supported_formats():
    return {
        "extensions": sorted(SUPPORTED_EXTS),
        "descriptions": {
            "csv": "Comma-separated values",
            "xlsx": "Excel workbook (multi-sheet supported)",
            "xls": "Legacy Excel",
            "db / sqlite / sqlite3": "SQLite database files",
        },
    }


@app.post("/upload", response_model=DatasetInfo)
async def upload(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    ext = file.filename.lower().rsplit(".", 1)[-1]
    if ext not in SUPPORTED_EXTS:
        raise HTTPException(
            400,
            f"Unsupported file type: .{ext}. "
            f"Supported: {', '.join('.' + e for e in sorted(SUPPORTED_EXTS))}",
        )

    dataset_id = str(uuid.uuid4())[:8]
    upload_dir = f"/tmp/lens/{dataset_id}"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = f"{upload_dir}/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())

    try:
        result = load_file(file_path, dataset_id)
    except Exception as e:
        cleanup_dataset(dataset_id)
        logger.exception("Failed to load file")
        raise HTTPException(400, f"Failed to parse file: {str(e)}")

    tables = result["tables"]
    if not tables:
        cleanup_dataset(dataset_id)
        raise HTTPException(400, "No usable tables found in file")

    schema = get_schema(dataset_id, tables)
    primary_table = tables[0]["name"]

    DATASETS[dataset_id] = {
        "filename": file.filename,
        "file_type": ext,
        "tables": tables,
        "schema": schema,
        "primary_table": primary_table,
    }

    return DatasetInfo(
        dataset_id=dataset_id,
        filename=file.filename,
        file_type=ext,
        tables=[TableInfo(**t) for t in tables],
        schema_info=schema,
        primary_table=primary_table,
    )


@app.get("/datasets")
def list_datasets():
    return [
        {
            "dataset_id": did,
            "filename": d["filename"],
            "file_type": d["file_type"],
            "table_count": len(d["tables"]),
            "primary_table": d["primary_table"],
        }
        for did, d in DATASETS.items()
    ]


@app.get("/datasets/{dataset_id}", response_model=DatasetInfo)
def get_dataset(dataset_id: str):
    if dataset_id not in DATASETS:
        raise HTTPException(404, "Dataset not found")
    d = DATASETS[dataset_id]
    return DatasetInfo(
        dataset_id=dataset_id,
        filename=d["filename"],
        file_type=d["file_type"],
        tables=[TableInfo(**t) for t in d["tables"]],
        schema_info=d["schema"],
        primary_table=d["primary_table"],
    )


@app.delete("/datasets/{dataset_id}")
def delete_dataset(dataset_id: str):
    if dataset_id not in DATASETS:
        raise HTTPException(404, "Dataset not found")
    cleanup_dataset(dataset_id)
    del DATASETS[dataset_id]
    CONVERSATIONS.pop(dataset_id, None)
    return {"ok": True}


@app.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    if req.dataset_id not in DATASETS:
        raise HTTPException(404, f"Dataset '{req.dataset_id}' not found. Upload first.")

    dataset = DATASETS[req.dataset_id]

    if req.table and not any(t["name"] == req.table for t in dataset["tables"]):
        raise HTTPException(400, f"Table '{req.table}' not in this dataset")

    conv_key = f"{req.dataset_id}:{req.conversation_id or 'default'}"
    history = CONVERSATIONS.get(conv_key, [])

    try:
        result = run_query_with_insights(
            question=req.question,
            schema=dataset["schema"],
            tables=dataset["tables"],
            primary_table=dataset["primary_table"],
            hinted_table=req.table,
            language=req.language or "en",
            conversation_history=history,
        )
    except Exception as e:
        logger.exception("Query failed")
        raise HTTPException(500, f"Query failed: {str(e)}")

    history.append({"q": req.question, "sql": result["sql"]})
    CONVERSATIONS[conv_key] = history[-10:]

    return QueryResponse(**result)
