# 🔍 Lens — Look closer at your data

An AI-powered data analysis tool that runs on your phone. Upload a CSV, Excel, or SQLite file, ask questions in plain English (or Hindi, Spanish, French…), and get insights with charts in seconds.

**Built different from typical "chat with your data" tools:**
- ✨ **Insight cards** — every result has a one-line key finding, not just a description
- 🌐 **Multilingual** — ask in your language, get answers back the same way
- 🎯 **Smart follow-ups** — Lens suggests 2-3 questions you might want to ask next
- 🎨 **Beautiful PWA** — installable on Android & iPhone, works offline-ish
- ⚡ **Quick actions** — one-tap shortcuts: Summary, Top 10, Trends, Outliers, Compare
- 📜 **Recent files** — remembers your last 5 uploads (browser-side)
- 🔒 **100% private** — data never leaves your device (only column names go to the AI)
- 🆓 **$0/month** — runs on free tier of Render + Vercel + Gemini

## 🚀 Quick start

### 📱 Mobile-only deploy (no laptop needed)

See **[DEPLOY.md](DEPLOY.md)** — full phone step-by-step.

TL;DR: GitHub → Render (backend) → Vercel (frontend) → install as PWA.

### 💻 Local development

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY="AIzaSy_your_key"
uvicorn app.main:app --host 0.0.0.0 --port 7377

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## 🛠️ Tech stack

| Layer | Tech |
|---|---|
| Backend | Python 3.11 + FastAPI + DuckDB |
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| UI | Custom glassmorphism design (no UI library) |
| Charts | Recharts (with custom gradients) |
| PWA | vite-plugin-pwa |
| AI | Google Gemini 1.5 Flash (free) |

## 📂 Project structure

```
lens-project/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI endpoints
│   │   ├── data_loader.py     # CSV/Excel/SQLite → DuckDB
│   │   ├── query.py           # NL → SQL + insights + follow-ups
│   │   └── __init__.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main app
│   │   ├── components/
│   │   │   ├── Logo.tsx       # Lens brand logo
│   │   │   ├── Uploader.tsx   # Drag-drop file upload
│   │   │   ├── ChatInput.tsx  # Auto-resizing input
│   │   │   ├── ResultCard.tsx # Insight + chart + follow-ups
│   │   │   ├── QuickActions.tsx # One-tap analysis shortcuts
│   │   │   ├── RecentFiles.tsx  # Browser-side history
│   │   │   └── EmptyState.tsx   # Animated welcome screen
│   │   ├── lib/api.ts         # Backend client
│   │   ├── index.css          # Glass + gradient design
│   │   └── main.tsx
│   ├── public/                # Lens icon (custom)
│   └── package.json
├── sample-data/
│   ├── sales_2024.csv
│   ├── hr_data.xlsx
│   └── ecommerce.db
├── DEPLOY.md
└── README.md
```

## 🧪 Test data

`sample-data/` has 3 ready-to-test files:
- **`sales_2024.csv`** — 24 sales records (revenue, region, category)
- **`hr_data.xlsx`** — 3 sheets: Employees, Departments, Projects
- **`ecommerce.db`** — 3 tables: customers, orders, products

## 💰 Cost

| Service | Cost |
|---|---|
| All code & libraries | Free, open source |
| Gemini API | Free (60 req/min, 1500/day) |
| Render (backend) | Free tier (with sleep) |
| Vercel (frontend) | Free |
| **Total** | **$0/month** |

## 🌍 Supported languages for chat

English, Hindi, Spanish, French, German, Portuguese, Italian, Japanese, Chinese, Korean, Arabic, Russian, and more (auto-detected from your question).

## 📜 License

MIT — use, modify, ship.
