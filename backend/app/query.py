"""
query.py — Lens edition: multilingual, insight-generating, with follow-ups.

What makes this different:
  - Detects & responds in the user's language
  - Generates a one-line "insight" (the actual finding, not just description)
  - Suggests 2-3 smart follow-up questions
  - Uses conversation context for follow-up questions
"""

import os
import json
from google import genai
from app.data_loader import query_dataset

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY env var not set. Get a free key at https://aistudio.google.com/app/apikey"
    )

client = genai.Client(api_key=GEMINI_API_KEY)
MODEL = "gemini-1.5-flash"


SYSTEM_PROMPT = """You are Lens, an expert data analyst.

Given a database schema, a user's question, and the user's language, you:
1. Pick the most appropriate table (or JOIN if needed).
2. Write a valid SQL query that answers the question.
3. Write a brief explanation of what the query does.
4. Generate a one-line "insight" — the ACTUAL finding, not just a description.
   (e.g. "Electronics dominates with 65% of revenue" not "This shows revenue by category")
5. Suggest 2-3 natural follow-up questions the user might want to ask next.

CRITICAL: Respond in the same language as the user's question.
- If the user writes in Hindi, respond in Hindi.
- If in Spanish, respond in Spanish.
- Technical names (table/column names, SQL) stay in English.

Return ONLY valid JSON:
{
  "table": "<exact table name from schema>",
  "sql": "SELECT ...",
  "explanation": "Brief explanation in user's language",
  "insight": "One-line key finding in user's language",
  "follow_ups": ["question 1 in user's language", "question 2", "question 3"]
}

Rules:
- Use exact table/column names from schema
- chart field is no longer needed (Lens generates charts automatically based on result shape)
- No markdown, pure JSON only"""


LANG_NAMES = {
    "en": "English", "hi": "Hindi", "es": "Spanish", "fr": "French",
    "de": "German", "pt": "Portuguese", "ja": "Japanese", "zh": "Chinese",
    "ko": "Korean", "ar": "Arabic", "ru": "Russian", "it": "Italian",
}


def _build_schema_text(schema: list[dict], tables: list[dict]) -> str:
    by_table: dict[str, list[dict]] = {}
    for col in schema:
        by_table.setdefault(col["table"], []).append(col)

    lines = ["Available tables and columns:\n"]
    for tbl in tables:
        original = tbl["original_name"]
        sql_name = tbl["name"]
        lines.append(
            f'  Table: "{sql_name}" (original name: "{original}", {tbl["rows"]} rows)'
        )
        for col in by_table.get(original, []):
            samples = ", ".join(col["samples"][:3]) if col["samples"] else "—"
            lines.append(f'    - {col["name"]} ({col["type"]}) — examples: {samples}')
        lines.append("")
    return "\n".join(lines)


def _detect_language(text: str) -> str:
    """Quick heuristic language detection from user text."""
    # Common words/scripts for popular languages
    if any(c in text for c in "ािीुूेैोौंः"):
        return "hi"
    if any(c in text for c in "äöüß"):
        return "de"
    if any(0x4E00 <= ord(c) <= 0x9FFF for c in text):
        return "zh"
    if any(0x3040 <= ord(c) <= 0x30FF for c in text):
        return "ja"
    if any(0xAC00 <= ord(c) <= 0xD7AF for c in text):
        return "ko"
    if any(0x0600 <= ord(c) <= 0x06FF for c in text):
        return "ar"
    if any(0x0400 <= ord(c) <= 0x04FF for c in text):
        return "ru"
    # Spanish/French/Portuguese/Italian by common words
    text_lower = text.lower()
    if any(w in text_lower for w in [" el ", " la ", " los ", " las ", " qué ", " cuánto ", " cómo "]):
        return "es"
    if any(w in text_lower for w in [" le ", " les ", " des ", " qué ", " combien ", " comment "]):
        return "fr"
    if any(w in text_lower for w in [" il ", " lo ", " gli ", " che ", " quanto "]):
        return "it"
    if any(w in text_lower for w in [" os ", " um ", " uma ", " quanto "]):
        return "pt"
    return "en"


def nl_to_query(
    question: str,
    schema: list[dict],
    tables: list[dict],
    language: str = "en",
    hinted_table: str | None = None,
    conversation_history: list[dict] | None = None,
) -> dict:
    schema_text = _build_schema_text(schema, tables)
    lang_name = LANG_NAMES.get(language, "English")

    hint_section = ""
    if hinted_table:
        orig = next(
            (t["original_name"] for t in tables if t["name"] == hinted_table),
            hinted_table,
        )
        hint_section = f'\nThe user has selected the table: "{orig}". Prefer this table.\n'

    history_section = ""
    if conversation_history:
        history_section = "\nRecent conversation (for follow-up context):\n"
        for h in conversation_history[-3:]:
            history_section += f'  Q: {h.get("q", "")}\n  SQL: {h.get("sql", "")[:100]}...\n'

    prompt = f"""{SYSTEM_PROMPT}

{schema_text}
{hint_section}{history_section}
User's language: {lang_name} ({language})
User question: "{question}"

JSON response:"""

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json",
            max_output_tokens=2048,
        ),
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        raise RuntimeError(f"LLM returned invalid JSON. Raw: {response.text[:500]}")

    if "sql" not in parsed:
        raise RuntimeError("LLM did not return SQL")

    parsed.setdefault("explanation", "")
    parsed.setdefault("insight", "")
    parsed.setdefault("follow_ups", [])
    parsed.setdefault("table", tables[0]["name"])

    return parsed


def _auto_chart(columns: list[str], rows: list[list]) -> dict | None:
    """Lens decides the best chart automatically based on result shape."""
    if not columns or not rows:
        return None
    if len(rows) > 200:
        rows = rows[:200]
    if len(columns) < 2:
        return None

    # Find a numeric column
    numeric_idx = None
    for i, col in enumerate(columns):
        if rows and isinstance(rows[0][i], (int, float)):
            numeric_idx = i
            break
    if numeric_idx is None:
        return None

    x_col = columns[0] if columns[0] != columns[numeric_idx] else columns[1] if len(columns) > 1 else None
    if x_col is None:
        return None
    x_idx = columns.index(x_col)
    y_col = columns[numeric_idx]
    y_idx = numeric_idx

    # Chart type: bar for <= 8 categories, line if column name has date/time, pie for <= 6
    lower_cols = " ".join(columns).lower()
    is_time = any(kw in lower_cols for kw in ["date", "month", "year", "day", "time", "fecha", "tarih"])

    chart_type = "bar"
    if is_time and len(rows) > 3:
        chart_type = "line"
    elif len(rows) <= 6 and rows and sum(1 for r in rows if isinstance(r[y_idx], (int, float)) and r[y_idx] > 0) == len(rows):
        # Could be pie — small, all-positive parts
        chart_type = "pie"

    data = []
    for row in rows:
        if row[y_idx] is None:
            continue
        try:
            y_val = float(row[y_idx])
        except (TypeError, ValueError):
            continue
        data.append({x_col: str(row[x_idx]), y_col: y_val})

    if not data:
        return None

    return {"type": chart_type, "x": x_col, "y": y_col, "data": data}


def run_query_with_insights(
    question: str,
    schema: list[dict],
    tables: list[dict],
    primary_table: str,
    hinted_table: str | None = None,
    language: str = "en",
    conversation_history: list[dict] | None = None,
) -> dict:
    # Auto-detect language if not specified
    if not language or language == "auto":
        language = _detect_language(question)

    plan = nl_to_query(
        question=question,
        schema=schema,
        tables=tables,
        language=language,
        hinted_table=hinted_table,
        conversation_history=conversation_history or [],
    )

    sql = plan["sql"]
    used_table = plan.get("table", primary_table)

    # Safety: ensure SQL references a known table
    known = {t["name"] for t in tables}
    if not any(name in sql for name in known):
        sql = sql.replace("FROM ", f'FROM "{primary_table}" ', 1)

    result = query_dataset("", sql)
    chart = _auto_chart(result["columns"], result["rows"])

    return {
        "sql": sql,
        "explanation": plan.get("explanation", ""),
        "insight": plan.get("insight", ""),
        "follow_ups": plan.get("follow_ups", [])[:3],
        "columns": result["columns"],
        "rows": result["rows"],
        "chart": chart,
        "used_table": used_table,
    }
