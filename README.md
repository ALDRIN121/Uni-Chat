
# Uni Chat Monorepo


This repository contains the full-stack Uni Chat application, including both frontend and backend code.

## Structure

- `frontend/` — Next.js, React, and Tailwind CSS chat UI
- `backend/` — FastAPI, Python backend for LLM streaming and API

## Quick Start

### 1. Clone the repository
```zsh
git clone <repo-url>
cd Uni\ chat/Uni-Chat
```

### 2. Setup the backend
```zsh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit as needed
uvicorn app.main:app --reload --port 8000
```

### 3. Setup the frontend
```zsh
cd ../frontend
npm install
npm run dev
# App runs at http://localhost:9002
```

## Development Notes
- The frontend expects the backend at `http://localhost:8000`.
- LLM API keys are managed in the backend `.env` file.
- See `frontend/README.md` and `backend/README.md` for more details on each part.

## License
MIT (or your license here)