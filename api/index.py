from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid
import os
import json
import csv
from io import StringIO

# In-memory dataset storage
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
    try:
        print(f"Upload started: {file.filename}, type={file.content_type}")
        
        if not file.filename:
            raise HTTPException(400, "No filename provided")

        filename_lower = file.filename.lower()
        if not filename_lower.endswith('.csv'):
            raise HTTPException(400, f"Only CSV files. Got: {file.filename}")

        content = await file.read()
        print(f"File size: {len(content)} bytes")
        
        if len(content) == 0:
            raise HTTPException(400, "File is empty")
        if len(content) > 4 * 1024 * 1024:
            raise HTTPException(400, "File too large (max 4MB)")
        
        # Try multiple encodings
        text = None
        for encoding in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
            try:
                text = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if text is None:
            raise HTTPException(400, "Could not decode file. Use UTF-8 CSV.")

        reader = csv.DictReader(StringIO(text))
        rows = list(reader)
        columns = reader.fieldnames or []
        
        print(f"Parsed {len(rows)} rows, columns: {columns}")

        if not rows:
            raise HTTPException(400, "CSV has no data rows")

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
            "tables": [{
                "name": f"data_{dataset_id}",
                "original_name": "data",
                "rows": len(rows),
                "columns": columns,
            }],
            "schema_info": [{
                "table": "data",
                "table_sql": f"data_{dataset_id}",
                "name": col,
                "type": _infer_type([row.get(col, "") for row in rows[:100]]),
                "samples": list(set(str(row.get(col, "")) for row in rows[:5] if row.get(col)))[:3],
            } for col in columns],
            "primary_table": f"data_{dataset_id}",
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Error: {type(e).__name__}: {str(e)[:200]}")


def _infer_type(values):
    """Simple type inference."""
    nums = 0
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
    """Ask a question about your data."""
    if req.dataset_id not in DATASETS:
        raise HTTPException(404, "Dataset not found. Upload first.")

    dataset = DATASETS[req.dataset_id]
    rows = dataset["rows"]
    columns = dataset["columns"]

    if not rows:
        raise HTTPException(400, "Dataset is empty")

    try:
        # Lazy import - only load when needed
        try:
            from google import genai
        except ImportError as ie:
            print(f"google-genai import failed: {ie}")
            return _fallback_response(rows, columns, req.question, dataset, req.language)
        
        GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
        if not GEMINI_API_KEY:
            print("GEMINI_API_KEY not set, using fallback")
            return _fallback_response(rows, columns, req.question, dataset, req.language)

        client = genai.Client(api_key=GEMINI_API_KEY)
        sample = rows[:10]
        stats = _compute_stats(rows, columns)

        lang_map = {
            "en": "English", "hi": "Hindi", "es": "Spanish",
            "fr": "French", "de": "German", "pt": "Portuguese",
        }
        lang_name = lang_map.get(req.language, "English")

        prompt = f"""You are Lens, a data analyst.

Dataset: {dataset['filename']} ({len(rows)} rows, {len(columns)} columns)
Columns: {columns}

Statistics:
{json.dumps(stats, indent=2, default=str)}

Sample (first 10 rows):
{json.dumps(sample, indent=2, default=str)}

User question (in {lang_name}): "{req.question}"

Respond in {lang_name}. Be concise (2-3 short paragraphs). Use specific numbers. No markdown."""

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=500,
            ),
        )
        answer = response.text.strip()
        first_sentence = answer.split(".")[0] + "." if "." in answer else answer[:100]

        chart = _make_simple_chart(rows, columns)
        return {
            "sql": f"-- AI analysis of {len(rows)} rows",
            "explanation": answer,
            "insight": first_sentence,
            "follow_ups": [
                "Top 5 by value?",
                "Show summary",
                "Any outliers?",
                "Trend over time?",
            ],
            "columns": columns,
            "rows": [[row.get(c, "") for c in columns] for row in rows[:50]],
            "chart": chart,
            "used_table": f"data_{req.dataset_id}",
        }
    except Exception as e:
        print(f"Query error: {type(e).__name__}: {e}")
        return _fallback_response(rows, columns, req.question, dataset, req.language)


def _fallback_response(rows, columns, question, dataset, language):
    """Fallback when AI is unavailable - return basic stats."""
    stats = _compute_stats(rows, columns)
    
    # Build a basic answer from stats
    answer = f"Dataset '{dataset['filename']}' has {len(rows)} rows and {len(columns)} columns.\n\n"
    answer += "Column statistics:\n"
    for col, stat in stats.items():
        if stat.get("type") == "number":
            answer += f"- {col}: avg={stat.get('avg', 0)}, min={stat.get('min', 0)}, max={stat.get('max', 0)}\n"
        else:
            answer += f"- {col}: {stat.get('unique', 0)} unique values\n"
    
    answer += f"\n(AI analysis unavailable - showing basic stats. Your question: {question})"
    
    chart = _make_simple_chart(rows, columns)
    return {
        "sql": "-- Basic stats (AI unavailable)",
        "explanation": answer,
        "insight": f"{len(rows)} rows, {len(columns)} columns analyzed",
        "follow_ups": ["Top 5?", "Summary?", "Outliers?"],
        "columns": columns,
        "rows": [[row.get(c, "") for c in columns] for row in rows[:50]],
        "chart": chart,
        "used_table": f"data_{dataset.get('_id', 'data')}",
    }


def _make_simple_chart(rows, columns):
    """Generate a simple bar chart from the data."""
    numeric_cols = [c for c in columns if _infer_type([row.get(c, "") for row in rows[:50]]) == "number"]
    if not numeric_cols:
        return None
    cat_cols = [c for c in columns if c not in numeric_cols]
    if not cat_cols:
        return None
    cat = cat_cols[0]
    num = numeric_cols[0]
    agg = {}
    for row in rows:
        key = str(row.get(cat, ""))
        val = row.get(num, "")
        try:
            v = float(str(val).replace(",", ""))
            agg[key] = agg.get(key, 0) + v
        except (ValueError, TypeError):
            pass
    top = sorted(agg.items(), key=lambda x: -x[1])[:10]
    if not top:
        return None
    return {
        "type": "bar",
        "x": cat,
        "y": num,
        "data": [{cat: k, num: v} for k, v in top if k],
    }


def _compute_stats(rows, columns):
    """Compute basic stats."""
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
        stats[col] = stat
    return stats


@app.delete("/api/datasets/{dataset_id}")
def delete_dataset(dataset_id: str):
    if dataset_id not in DATASETS:
        raise HTTPException(404, "Not found")
    del DATASETS[dataset_id]
    return {"ok": True}


@app.get("/api/datasets")
def list_datasets():
    return [{
        "dataset_id": did,
        "filename": d["filename"],
        "file_type": d["file_type"],
        "table_count": 1,
    } for did, d in DATASETS.items()]
