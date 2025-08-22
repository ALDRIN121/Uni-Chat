import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    GROQ_API_KEY: str = os.getenv('GROQ_API_KEY')
    
    # Server configuration
    PORT: int = int(os.getenv('PORT', 8000))
    HOST: str = os.getenv('HOST', '127.0.0.1')
    
    # Database configuration
    DATABASE_URL: str = os.getenv('DATABASE_URL', 'sqlite:///./uni_chat.db')

settings = Settings()
