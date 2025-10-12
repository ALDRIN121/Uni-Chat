
# Uni Chat - Universal AI Chat Interface

A full-stack chat application with user authentication, LLM configuration management, and real-time streaming chat.

## 📖 Description

Uni Chat is a modern, universal AI chat interface that empowers users to interact with multiple Large Language Models (LLMs) through a single, elegant platform. Built with a focus on simplicity and user experience, Uni Chat provides a minimalistic yet powerful environment for AI-powered conversations.

### What is Uni Chat?

Uni Chat serves as a unified gateway to various AI models, allowing you to configure and switch between different LLM providers seamlessly. Whether you're using GROQ, OpenAI, or Anthropic, Uni Chat provides a consistent, clean interface for all your AI interactions.

### Key Capabilities

- **Universal LLM Support**: Connect to multiple AI providers using your own API keys, giving you full control and flexibility
- **Secure & Private**: Your API keys and chat history are securely stored and accessible only to you
- **Real-time Streaming**: Experience natural, flowing conversations with WebSocket-powered streaming responses
- **Persistent Sessions**: Save and manage multiple chat sessions, allowing you to organize conversations by topic or project
- **Zero Configuration Database**: SQLite-powered storage that sets itself up automatically - no manual database configuration required
- **Modern Architecture**: Built on proven technologies (Next.js, React, FastAPI) for a responsive and reliable experience

### Who is it for?

Uni Chat is perfect for:
- Developers who want a clean interface to interact with AI models
- Researchers managing multiple AI conversations and experiments
- Teams looking for a self-hosted AI chat solution with full data control
- Anyone who values privacy and wants to use AI with their own API keys

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
