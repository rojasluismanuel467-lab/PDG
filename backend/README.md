# ARQDATA Backend

FastAPI backend for the ARQDATA platform.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
```

## Run

```bash
uvicorn app.main:app --reload
```
