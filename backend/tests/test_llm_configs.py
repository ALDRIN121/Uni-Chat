from unittest.mock import patch
from app.models import LLMProvider


def test_create_llm_config_with_valid_key(auth_client, db):
    """Creating an LLM config with a validated API key should succeed."""
    # Ensure a provider exists (seeded via fixtures or insert directly)
    provider = db.query(LLMProvider).filter(LLMProvider.name == "groq").first()
    if not provider:
        provider = LLMProvider(
            name="groq", display_name="Groq", is_active=True,
            supported_models=["llama3-70b-8192"],
        )
        db.add(provider)
        db.commit()

    with patch("app.services.validation_service.process_query") as mock:
        mock.return_value = {"response": "Hello!"}
        resp = auth_client.post("/users/me/llm-configs", json={
            "provider_id": provider.id,
            "model_name": "llama3-70b-8192",
            "api_key": "gsk_test_123",
            "is_default": True,
        })
        assert resp.status_code == 200
        body = resp.json()
        assert body["model_name"] == "llama3-70b-8192"
        assert body["is_default"] is True


def test_create_llm_config_invalid_key_rejected(auth_client, db):
    """An invalid API key should return 400."""
    provider = db.query(LLMProvider).filter(LLMProvider.name == "groq").first()
    if not provider:
        provider = LLMProvider(
            name="groq", display_name="Groq", is_active=True,
            supported_models=["llama3-70b-8192"],
        )
        db.add(provider)
        db.commit()

    with patch("app.services.validation_service.process_query") as mock:
        mock.side_effect = Exception("Authentication error: invalid API key")
        resp = auth_client.post("/users/me/llm-configs", json={
            "provider_id": provider.id,
            "model_name": "llama3-70b-8192",
            "api_key": "bad_key",
        })
        assert resp.status_code == 400


def test_second_default_flips_first(auth_client, db):
    """Creating a second default config should un-default the first."""
    provider = db.query(LLMProvider).filter(LLMProvider.name == "groq").first()
    if not provider:
        provider = LLMProvider(
            name="groq", display_name="Groq", is_active=True,
            supported_models=["llama3-70b-8192"],
        )
        db.add(provider)
        db.commit()

    with patch("app.services.validation_service.process_query") as mock:
        mock.return_value = {"response": "OK"}
        # Create first default
        r1 = auth_client.post("/users/me/llm-configs", json={
            "provider_id": provider.id,
            "model_name": "llama3-70b-8192",
            "api_key": "key1",
            "is_default": True,
        })
        assert r1.status_code == 200
        # Create second default
        r2 = auth_client.post("/users/me/llm-configs", json={
            "provider_id": provider.id,
            "model_name": "gemma-7b-it",
            "api_key": "key2",
            "is_default": True,
        })
        assert r2.status_code == 200

    # Fetch all configs — only the latest should be default
    resp = auth_client.get("/users/me/llm-configs")
    configs = resp.json()
    assert len(configs) == 2
    assert configs[1]["is_default"] is True


def test_unknown_provider_rejected(auth_client):
    """Creating a config with a nonexistent provider should return 400."""
    resp = auth_client.post("/users/me/llm-configs", json={
        "provider_id": 9999,
        "model_name": "gpt-4",
        "api_key": "sk-test",
    })
    assert resp.status_code == 400
