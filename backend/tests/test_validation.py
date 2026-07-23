import asyncio
from unittest.mock import patch
from app.services.validation_service import validate_api_key, validate_groq_api_key


def test_validate_api_key_success():
    with patch("app.services.validation_service.process_query") as mock:
        mock.return_value = {"response": "Hello there!"}
        result = asyncio.run(validate_api_key("groq", "llama3-70b-8192", "test-key"))
        assert result["valid"] is True
        assert result["model_tested"] == "llama3-70b-8192"


def test_validate_api_key_empty_response():
    with patch("app.services.validation_service.process_query") as mock:
        mock.return_value = {"response": ""}
        result = asyncio.run(validate_api_key("openai", "gpt-4o", "test-key"))
        assert result["valid"] is False


def test_validate_api_key_auth_error():
    with patch("app.services.validation_service.process_query") as mock:
        mock.side_effect = Exception("Authentication error: invalid API key")
        result = asyncio.run(validate_api_key("anthropic", "claude-sonnet-4", "bad-key"))
        assert result["valid"] is False
        assert result["error_type"] == "authentication"


def test_validate_groq_api_key_is_backwards_compat():
    with patch("app.services.validation_service.process_query") as mock:
        mock.return_value = {"response": "Hi!"}
        result = asyncio.run(validate_groq_api_key("test-key"))
        assert result["valid"] is True
