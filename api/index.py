from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid
import os
import json
import csv
from io import StringIO

# In-memory dataset storage (Vercel serverless)
DATASETS: dict = {}

app = FastAPI(title="Lens API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "service": "lens", "version": "1.0.0"}


@app.get("/api")
@app.get("/api/")
def api_root():
    return {"status": "ok", "service": "lens", "version": "1.0.0"}


@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "lens", "version": "1.0.0"}


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    """Upload a CSV file. Returns dataset info."""
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    ext = file.filename.lower().rsplit(".", 1)[-1]
    if ext != "csv":
        raise HTTPException(400, f"Only CSV supported in this version. Got: .{ext}")

    try:
        content = await file.read()
        text = content.decode("utf-8")
        reader = csv.DictReader(StringIO(text))
        rows = list(reader)
        columns = reader.fieldnames or []
    except Exception as e:
        raise HTTPException(400, f"Failed to parse CSV: {str(e)}")

    if not rows:
        raise HTTPException(400, "CSV file is empty")

    dataset_id = str(uuid.uuid4())[:8]

    DATASETS[dataset_id] = {
        "filename": file.filename,
        "file_type": "csv",
        "rows": rows,
        "columns": columns,
    }

    return {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "file_type": "csv",
        "tables": [
            {
                "name": f"data_{dataset_id}",
                "original_name": "data",
                "rows": len(rows),
                "columns": columns,
            }
        ],
        "schema_info": [
            {
                "table": "data",
                "table_sql": f"data_{dataset_id}",
                "name": col,
                "type": _infer_type([row.get(col, "") for row in rows[:100]]),
                "samples": list(set(str(row.get(col, "")) for row in rows[:5] if row.get(col))),
            }
            for col in columns
        ],
        "primary_table": f"data_{dataset_id}",
    }


def _infer_type(values):
    """Simple type inference for a column."""
    nums = 0
    dates = 0
    total = 0
    for v in values:
        if v is None or v == "":
            continue
        total += 1
        try:
            float(str(v).replace(",", ""))
            nums += 1
        except (ValueError, TypeError):
            pass
    if total == 0:
        return "text"
    if nums / total > 0.8:
        return "number"
    return "text"


class QueryRequest(BaseModel):
    dataset_id: str
    question: str
    language: Optional[str] = "en"
    table: Optional[str] = None


@app.post("/api/query")
def query(req: QueryRequest):
    """Ask a question about your data in natural language."""
    if req.dataset_id not in DATASETS:
        raise HTTPException(404, "Dataset not found. Upload first.")

    dataset = DATASETS[req.dataset_id]
    rows = dataset["rows"]
    columns = dataset["columns"]

    if not rows:
        raise HTTPException(400, "Dataset is empty")

    try:
        # Use Gemini to analyze
        from google import genai
        GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY not set in environment")

        client = genai.Client(api_key=GEMINI_API_KEY)

        # Compute basic statistics to give the AI context
        sample = rows[:10]
        stats = _compute_stats(rows, columns)

        lang_map = {
            "en": "English", "hi": "Hindi", "es": "Spanish",
            "fr": "French", "de": "German", "pt": "Portuguese",
            "ja": "Japanese", "zh": "Chinese", "ar": "Arabic",
        }
        lang_name = lang_map.get(req.language, "English")

        prompt = f"""You are Lens, an expert data analyst.

Dataset: {dataset['filename']} ({len(rows)} rows, {len(columns)} columns)
Columns: {columns}

Statistics:
{json.dumps(stats, indent=2)}

Sample data (first 10 rows):
{json.dumps(sample, indent=2, default=str)}

User question (in {lang_name}): "{req.question}"

CRITICAL: Respond in the SAME language as the user's question ({lang_name}).

Analyze the data and provide a clear answer. Include specific numbers, percentages, and trends where relevant.

Format your response in 2-3 short paragraphs. Be concise but insightful. Use plain text (no markdown)."""

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=600,
            ),
        )

        answer = response.text.strip()

        # Parse out the first sentence as an "insight"
        first_sentence = answer.split(".")[0] + "."

        # Simple filter: try to compute top 5 by first numeric column
        numeric_cols = [c for c in columns if _infer_type([row.get(c, "") for row in rows[:50]]) == "number"]
        chart = None
        if numeric_cols:
            # Group by first non-numeric column
            cat_cols = [c for c in columns if c not in numeric_cols]
            if cat_cols:
                cat = cat_cols[0]
                num = numeric_cols[0]
                agg = {}
                for row in rows:
                    key = str(row.get(cat, ""))
                    val = row.get(num, "")
                    try:
                        val_num = float(str(val).replace(",", ""))
                        agg[key] = agg.get(key, 0) + val_num
                    except (ValueError, TypeError):
                        pass
                top = sorted(agg.items(), key=lambda x: -x[1])[:10]
                if top:
                    chart = {
                        "type": "bar",
                        "x": cat,
                        "y": num,
                        "data": [{cat: k, num: v} for k, v in top if k],
                    }

        return {
            "sql": f"-- AI analysis of {len(rows)} rows",
            "explanation": answer,
            "insight": first_sentence,
            "follow_ups": [
                "What are the top 5 by value?",
                "Show me a summary",
                "Are there any outliers?",
                "What's the trend over time?",
            ],
            "columns": columns,
            "rows": [[row.get(c, "") for c in columns] for row in rows[:50]],
            "chart": chart,
            "used_table": f"data_{req.dataset_id}",
        }

    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {str(e)}")


def _compute_stats(rows, columns):
    """Compute basic stats for each column."""
    stats = {}
    for col in columns:
        col_type = _infer_type([row.get(col, "") for row in rows[:100]])
        values = [row.get(col, "") for row in rows if row.get(col) not in (None, "")]
        stat = {"type": col_type, "count": len(values)}
        if col_type == "number":
            try:
                nums = [float(str(v).replace(",", "")) for v in values]
                if nums:
                    stat["min"] = min(nums)
                    stat["max"] = max(nums)
                    stat["avg"] = round(sum(nums) / len(nums), 2)
                    stat["sum"] = round(sum(nums), 2)
            except (ValueError, TypeError):
                pass
        else:
            stat["unique"] = len(set(str(v) for v in values))
            if values:
                stat["sample"] = list(set(str(v) for v in values[:5]))
        stats[col] = stat
    return stats


@app.delete("/api/datasets/{dataset_id}")
def delete_dataset(dataset_id: str):
    if dataset_id not in DATASETS:
        raise HTTPException(404, "Dataset not found")
    del DATASETS[dataset_id]
    return {"ok": True}


@app.get("/api/datasets")
def list_datasets():
    return [
        {
            "dataset_id": did,
            "filename": d["filename"],
            "file_type": d["file_type"],
            "table_count": 1,
        }
        for did, d in DATASETS.items()
]
