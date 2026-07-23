from app.services.langchain_service import process_query
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


async def validate_api_key(provider_name: str, model_name: str, api_key: str) -> Dict[str, Any]:
    """
    Validate an LLM provider API key by testing it with a simple prompt.

    Args:
        provider_name: "groq", "openai", or "anthropic"
        model_name: The model to test with
        api_key: The API key to validate

    Returns:
        Dict with validation result and details
    """
    test_config = {
        "provider_name": provider_name,
        "model_name": model_name,
        "api_key": api_key,
        "temperature": 0,
        "max_tokens": 50,
    }

    try:
        response = process_query("Hi", test_config)

        if response and response.get("response") and response["response"].strip():
            return {
                "valid": True,
                "message": "API key is valid and model is accessible",
                "model_tested": model_name,
                "test_response": response["response"][:100] + "..."
                if len(response["response"]) > 100
                else response["response"],
            }
        else:
            return {
                "valid": False,
                "message": "API key validation failed: No response received",
                "model_tested": model_name,
            }

    except Exception as e:
        logger.error(f"{provider_name} API key validation failed: {str(e)}")
        error_msg = str(e).lower()

        if any(w in error_msg for w in ("authentication", "unauthorized", "invalid", "api_key", "api key")):
            return {
                "valid": False,
                "message": f"Invalid API key. Please check your {provider_name} API key and try again.",
                "error_type": "authentication",
            }
        elif any(w in error_msg for w in ("model", "not found")):
            return {
                "valid": False,
                "message": f"Model '{model_name}' is not accessible with this API key.",
                "error_type": "model_access",
            }
        elif any(w in error_msg for w in ("quota", "limit", "rate")):
            return {
                "valid": False,
                "message": "API key has reached its usage limit or quota.",
                "error_type": "quota",
            }
        else:
            return {
                "valid": False,
                "message": f"API validation failed: {str(e)}",
                "error_type": "unknown",
            }


async def validate_groq_api_key(api_key: str, model_name: str = "deepseek-r1-distill-llama-70b") -> Dict[str, Any]:
    """Backwards-compatible wrapper for Groq-specific validation."""
    return await validate_api_key("groq", model_name, api_key)
