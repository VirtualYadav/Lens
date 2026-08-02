from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uuid
import csv
from io import StringIO

DATASETS = {}

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    try:
        if not file.filename or not file.filename.lower().endswith('.csv'):
            raise HTTPException(400, "CSV only")
        content = await file.read()
        try:
            text = content.decode('utf-8-sig')
        except:
            text = content.decode('utf-8', errors='ignore')
        reader = csv.DictReader(StringIO(text))
        rows = list(reader)
        columns = reader.fieldnames or []
        if not rows:
            raise HTTPException(400, "Empty")
        did = str(uuid.uuid4())[:8]
        DATASETS[did] = {"filename": file.filename, "rows": rows, "columns": columns}
        return {
            "dataset_id": did,
            "filename": file.filename,
            "file_type": "csv",
            "tables": [{"name": f"data_{did}", "original_name": "data", "rows": len(rows), "columns": columns}],
            "schema_info": [{"table": "data", "table_sql": f"data_{did}", "name": c, "type": "text", "samples": []} for c in columns],
            "primary_table": f"data_{did}",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e)[:200])

@app.post("/query")
def query(req: dict):
    did = req.get("dataset_id")
    if did not in DATASETS:
        raise HTTPException(404, "Not found")
    d = DATASETS[did]
    return {
        "sql": "--",
        "explanation": f"Dataset has {len(d['rows'])} rows. Question: {req.get('question', '')}",
        "insight": f"{len(d['rows'])} rows",
        "follow_ups": [],
        "columns": d["columns"],
        "rows": [[r.get(c, "") for c in d["columns"]] for r in d["rows"][:50]],
        "chart": None,
        "used_table": f"data_{did}",
    }
