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

# Accepts a list of messages (dicts with 'role' and 'content')
async def process_query_stream(messages):
    llm = ChatGroq(
        model="deepseek-r1-distill-llama-70b",
        temperature=0,
        max_tokens=None,
        reasoning_format="parsed",
        timeout=None,
        max_retries=2,
        api_key=settings.GROQ_API_KEY,
    )
    # Convert messages to the format expected by the LLM: list of (role, content)
    formatted_messages = [(m['role'], m['content']) for m in messages]
    async for chunk in llm.astream(formatted_messages):
        yield chunk.content
