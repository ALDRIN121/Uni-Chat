import time
from langchain_groq import ChatGroq
from app.core.config import settings
import asyncio


def process_query(query: str, llm_config=None):
    api_key = llm_config.get('api_key') if llm_config else settings.GROQ_API_KEY
    model = llm_config.get('model_name', 'deepseek-r1-distill-llama-70b') if llm_config else 'deepseek-r1-distill-llama-70b'
    
    llm = ChatGroq(
        model=model,
        temperature=llm_config.get('temperature', 0) if llm_config else 0,
        max_tokens=llm_config.get('max_tokens') if llm_config else None,
        reasoning_format="parsed",
        timeout=None,
        max_retries=2,
        api_key=api_key,
    )
    messages = [
        ("system", "You are a helpful assistant. Answer the user's question."),
        ("human", query),
    ]
    ai_msg = llm.invoke(messages)
    return {
        "response": ai_msg.content
    }

# Accepts a list of messages (dicts with 'role' and 'content') and LLM config
async def process_query_stream(messages, llm_config=None):
    api_key = llm_config.get('api_key') if llm_config else settings.GROQ_API_KEY
    model = llm_config.get('model_name', 'deepseek-r1-distill-llama-70b') if llm_config else 'deepseek-r1-distill-llama-70b'
    
    llm = ChatGroq(
        model=model,
        temperature=llm_config.get('temperature', 0) if llm_config else 0,
        max_tokens=llm_config.get('max_tokens') if llm_config else None,
        reasoning_format="parsed",
        timeout=None,
        max_retries=2,
        api_key=api_key,
    )
    # Convert messages to the format expected by the LLM: list of (role, content)
    formatted_messages = [(m['role'], m['content']) for m in messages]
    async for chunk in llm.astream(formatted_messages):
        yield chunk.content
