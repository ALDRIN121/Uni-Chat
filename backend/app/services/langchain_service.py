from app.services.providers import get_chat_model, to_lc_messages
from app.core.config import settings


def process_query(query: str, llm_config=None):
    cfg = llm_config or {}
    model = get_chat_model(
        cfg.get("provider_name", "groq"),
        cfg.get("model_name", "llama3-70b-8192"),
        cfg.get("api_key") or settings.GROQ_API_KEY,
        temperature=cfg.get("temperature", 0),
        max_tokens=cfg.get("max_tokens", 50),
    )
    ai = model.invoke(to_lc_messages([{"role": "user", "content": query}]))
    return {"response": ai.content}


async def process_query_stream(messages, llm_config=None):
    cfg = llm_config or {}
    model = get_chat_model(
        cfg.get("provider_name", "groq"),
        cfg.get("model_name", "llama3-70b-8192"),
        cfg.get("api_key") or settings.GROQ_API_KEY,
        temperature=cfg.get("temperature", 0),
        max_tokens=cfg.get("max_tokens"),
        streaming=True,
    )
    async for chunk in model.astream(to_lc_messages(messages, cfg.get("system_prompt", "You are a helpful assistant."))):
        yield chunk.content
