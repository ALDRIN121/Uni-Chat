import time
from langchain_groq import ChatGroq
from app.core.config import settings
import asyncio


def process_query(query: str):
    llm = ChatGroq(
        model="deepseek-r1-distill-llama-70b",
        temperature=0,
        max_tokens=None,
        reasoning_format="parsed",
        timeout=None,
        max_retries=2,
        api_key=settings.GROQ_API_KEY,
    )
    messages = [
        ("system", "You are a helpful assistant. Answer the user's question."),
        ("human", query),
    ]
    ai_msg = llm.invoke(messages)
    return {
        "response": ai_msg.content
    }

async def process_query_stream(query: str):
    llm = ChatGroq(
        model="deepseek-r1-distill-llama-70b",
        temperature=0,
        max_tokens=None,
        reasoning_format="parsed",
        timeout=None,
        max_retries=2,
        api_key=settings.GROQ_API_KEY,
    )
    messages = [
        ("system", "You are a helpful assistant. Answer the user's question."),
        ("human", query),
    ]
    async for chunk in llm.astream(messages):
        yield chunk.content
