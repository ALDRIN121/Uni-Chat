from sqlalchemy import Column, Integer, String, Text, JSON, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    llm_configs = relationship("UserLLMConfig", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")

class LLMProvider(Base):
    __tablename__ = "llm_providers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # e.g., "OpenAI", "Groq", "Anthropic"
    display_name = Column(String, nullable=False)  # e.g., "OpenAI GPT"
    is_active = Column(Boolean, default=True)
    supported_models = Column(JSON, nullable=False)  # List of supported models
    
    # Relationships
    user_configs = relationship("UserLLMConfig", back_populates="provider")

class UserLLMConfig(Base):
    __tablename__ = "user_llm_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("llm_providers.id"), nullable=False)
    model_name = Column(String, nullable=False)  # e.g., "gpt-4", "llama2-70b-4096"
    api_key_encrypted = Column(Text)  # Encrypted API key
    config_params = Column(JSON, default={})  # Additional model parameters
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="llm_configs")
    provider = relationship("LLMProvider", back_populates="user_configs")
    chat_sessions = relationship("ChatSession", back_populates="llm_config")

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    llm_config_id = Column(Integer, ForeignKey("user_llm_configs.id"), nullable=False)
    title = Column(String)  # Optional session title
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    llm_config = relationship("UserLLMConfig", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
