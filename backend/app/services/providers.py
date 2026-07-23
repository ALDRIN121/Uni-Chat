from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

SUPPORTED = {"groq", "openai", "anthropic"}

_ROLE_MAP = {"user": "human", "assistant": "ai", "system": "system"}


def to_lc_messages(messages, system_prompt="You are a helpful assistant."):
    out = [("system", system_prompt)]
    for m in messages:
        out.append((_ROLE_MAP.get(m["role"], "human"), m["content"]))
    return out


def get_chat_model(provider_name, model, api_key, *, temperature=0, max_tokens=None, streaming=False):
    name = provider_name.lower()
    if name == "groq":
        return ChatGroq(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=api_key,
            streaming=streaming,
            max_retries=2,
        )
    if name == "openai":
        return ChatOpenAI(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=api_key,
            streaming=streaming,
            max_retries=2,
        )
    if name == "anthropic":
        return ChatAnthropic(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens or 1024,
            api_key=api_key,
            streaming=streaming,
            max_retries=2,
        )
    raise ValueError(f"Unsupported provider: {provider_name}")
