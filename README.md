# FactCheck Live 🔍

Real-time AI-powered fact-checking and analysis of YouTube video captions.

## Features

- **🎬 Embedded Video** – Watch the video alongside a live fact-checking feed
- **🟢🔴🟡🔵 Colour-coded verdicts** – Each caption segment is tagged as *True*, *False*, *Contentious*, *Needs Context*, or *Unverifiable*
- **📚 Running References tab** – All cited sources collected in one place
- **💬 Discussion panel** – Click any caption item to open a deep-dive with full analysis, definitions, and references
- **📖 Definition tooltips** – Hover over technical terms for inline definitions

## Architecture

```
fact-checker/
├── backend/          # Python FastAPI + OpenAI + youtube-transcript-api
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   └── test_main.py
└── frontend/         # React + TypeScript + Vite + Tailwind CSS
    └── src/
        ├── App.tsx
        ├── types.ts
        └── components/
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Running tests

```bash
cd backend
pytest test_main.py -v
```

## How It Works

1. Paste a YouTube URL into the input box and click **Analyse**
2. The backend extracts the video ID and fetches the closed captions via `youtube-transcript-api`
3. Captions are grouped into ~8-second chunks and sent to **GPT-4o-mini** for fact-checking
4. Results are streamed back to the browser via **Server-Sent Events (SSE)**
5. Each caption card is colour-coded and clickable for deeper discussion

## Notes

- The video must have English closed captions enabled
- Fact-checking quality depends on the OpenAI model; results are informational and not authoritative
- Rate limits on the OpenAI API may slow down processing for long videos
