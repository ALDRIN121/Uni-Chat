# Uni Chat Backend

This is the backend for the Uni Chat application, built with FastAPI and Python. It provides the API and LLM streaming for the frontend.

## Prerequisites
- Python 3.10+
- (Recommended) Create and activate a virtual environment:
  ```zsh
  python3 -m venv .venv
  source .venv/bin/activate
  ```

## Setup

1. **Install dependencies:**
   ```zsh
   pip install -r requirements.txt
   ```

2. **Environment variables:**
   - Copy `.env.example` to `.env` and fill in your API keys and settings as needed.

3. **Run the backend server:**
   ```zsh
   uvicorn app.main:app --reload --port 8000
   ```
   The API will be available at [http://localhost:8000](http://localhost:8000).

4. **Run tests:**
   ```zsh
   # Example for pytest (if tests are present)
   pytest
   ```

## Project Structure
- `app/` - Main FastAPI app, routers, services, and utilities
- `tests/` - Backend tests

## Notes
- The backend provides a WebSocket endpoint for streaming LLM responses to the frontend.
- Make sure your API keys are set in `.env` for LLM access.
- The backend expects the frontend to run on `http://localhost:9002` by default (CORS is enabled).

---

# Backend API

Production-grade FastAPI backend for Uni Chat.

## Features
- `/chat` endpoint for LLM queries (LangChain + Groq)
- Modular structure: core, routers, services, utils
- .env config for secrets

## Quickstart
```sh
pip install -r requirements.txt
uvicorn app.main:app --reload
```
