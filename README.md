
# Uni Chat - Universal AI Chat Interface

A full-stack chat application with user authentication, LLM configuration management, and real-time streaming chat.

## ✨ Features

- 🔐 **User Authentication** - Secure JWT-based auth
- 🤖 **Multiple LLM Support** - GROQ, OpenAI, Anthropic
- 💾 **SQLite Database** - Automatic setup, no configuration needed
- 🔄 **Real-time Streaming** - WebSocket-powered chat
- 🎨 **Modern UI** - Next.js, React, Tailwind CSS
- 🔑 **API Key Management** - Secure storage and validation

## 🚀 Quick Start

**New to this project?** See the [Setup Guide](SETUP.md) for detailed instructions.

### Fast Setup (1 minute)

```bash
# Clone and setup backend
git clone https://github.com/ALDRIN121/Uni-Chat.git
cd Uni-Chat/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python start_server.py &

# Setup frontend  
cd ../frontend
npm install && npm run dev
```

**That's it!** Database is auto-created. Visit http://localhost:9002

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
MIT 
