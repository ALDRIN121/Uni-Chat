# Setup Guide for New Developers

This guide will help you set up the Uni-Chat application on your local machine.

## Prerequisites

- Python 3.8+ 
- Node.js 18+
- Git

## 🚀 Quick Setup

### 1. Clone the Repository
```bash
git clone https://github.com/ALDRIN121/Uni-Chat.git
cd Uni-Chat
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the backend server
python -m uvicorn app.main:app --reload --port 8000
```

**✅ Database is automatically created!**
- SQLite database (`uni_chat.db`) will be created automatically
- All tables and default data will be initialized on first run
- No manual database setup required!

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:9002
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📋 First Time Usage

1. **Register**: Create a new account
2. **Login**: Sign in with your credentials  
3. **Setup LLM**: Configure your GROQ API key
   - Get a free key from [groq.com](https://groq.com)
   - Default model: `deepseek-r1-distill-llama-70b`
4. **Start Chatting**: Enjoy your AI assistant!

## 🗃️ Database Information

- **Type**: SQLite (file-based)
- **Location**: `backend/uni_chat.db`
- **Auto-setup**: ✅ Tables created automatically
- **Default data**: ✅ LLM providers pre-configured
- **Migrations**: Not needed - schema is auto-created

### Database Features:
- User authentication with JWT
- LLM provider configurations (GROQ, OpenAI, Anthropic)
- Chat session management
- Message history
- Encrypted API key storage

## 🔧 Development Notes

### Database
- Database file is git-ignored (not committed)
- Each developer gets their own fresh database
- No shared database conflicts
- Reset anytime by deleting `uni_chat.db`

### Environment Variables
```bash
# backend/.env (optional - API keys stored in DB)
GROQ_API_KEY=your_key_here  # Only for testing
```

### Common Issues

**Backend won't start?**
- Make sure virtual environment is activated
- Check Python version: `python --version`
- Install dependencies: `pip install -r requirements.txt`

**Frontend won't start?**
- Check Node version: `node --version`
- Clear node_modules: `rm -rf node_modules && npm install`

**Database issues?**
- Delete `uni_chat.db` file to reset
- Restart backend to recreate

## 📝 Project Structure

```
Uni-Chat/
├── backend/
│   ├── app/
│   │   ├── models.py          # Database models
│   │   ├── database.py        # DB setup & initialization
│   │   ├── main.py           # FastAPI app
│   │   └── ...
│   ├── requirements.txt
│   └── uni_chat.db          # SQLite database (auto-created)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── ...
│   └── package.json
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

---

**Need help?** Check the API documentation at http://localhost:8000/docs when running locally.
