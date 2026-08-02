from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uuid
import csv
from io import StringIO

app = FastAPI()

# Explicit CORS - allow everything
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Handle OPTIONS preflight
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    return {"ok": True}

DATASETS = {}

@app.get("/")
@app.get("/upload")
@app.get("/query")
def root():
    return {"status": "ok", "service": "lens"}

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    try:
        print(f"Upload received: {file.filename}")
        
        if not file.filename:
            raise HTTPException(400, "No filename")
        
        if not file.filename.lower().endswith('.csv'):
            raise HTTPException(400, f"Only CSV. Got: {file.filename}")
        
        content = await file.read()
        print(f"Size: {len(content)}")
        
        try:
            text = content.decode('utf-8-sig')
        except:
            text = content.decode('utf-8', errors='ignore')
        
        reader = csv.DictReader(StringIO(text))
        rows = list(reader)
        columns = reader.fieldnames or []
        
        print(f"Parsed: {len(rows)} rows, {len(columns)} cols: {columns}")
        
        if not rows:
            raise HTTPException(400, "Empty CSV")
        
        did = str(uuid.uuid4())[:8]
        DATASETS[did] = {"filename": file.filename, "rows": rows, "columns": columns}
        
        return {
            "dataset_id": did,
            "filename": file.filename,
            "file_type": "csv",
            "tables": [{
                "name": f"data_{did}",
                "original_name": "data",
                "rows": len(rows),
                "columns": columns
            }],
            "schema_info": [{
                "table": "data",
                "table_sql": f"data_{did}",
                "name": c,
                "type": "text",
                "samples": []
            } for c in columns],
            "primary_table": f"data_{did}"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(500, str(e)[:200])

@app.post("/query")
def query(req: dict):
    did = req.get("dataset_id")
    if did not in DATASETS:
        raise HTTPException(404, "Dataset not found")
    d = DATASETS[did]
    return {
        "sql": "--",
        "explanation": f"Dataset: {len(d['rows'])} rows, {len(d['columns'])} columns. Q: {req.get('question', '')}",
        "insight": f"{len(d['rows'])} rows analyzed",
        "follow_ups": [],
        "columns": d["columns"],
        "rows": [[r.get(c, "") for c in d["columns"]] for r in d["rows"][:50]],
        "chart": None,
        "used_table": f"data_{did}"
    }
