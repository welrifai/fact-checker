# Fact Checker

A full-stack application that uses OpenAI's GPT-4o-mini to fact-check claims and statements in real time.

## Prerequisites

- Node.js 18+
- Python 3.11+
- An OpenAI API key

## Project Structure

```
fact-checker/
├── backend/       # FastAPI Python backend
└── frontend/      # React + TypeScript + Vite frontend
```

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### Frontend

```bash
cd frontend
npm install
```

## Running the Application

**Backend** (port 8000):

```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Frontend** (port 5173):

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Running Tests

```bash
cd backend
OPENAI_API_KEY=test pytest test_main.py -v
```

## Environment Variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key. Set to `test` to use mock mode. |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/check` | Fact-check a claim (`{"text": "..."}`) |

