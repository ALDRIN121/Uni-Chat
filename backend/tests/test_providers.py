import pytest
from app.services import providers


def test_role_mapping_and_system_prompt():
    msgs = [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "yo"}]
    out = providers.to_lc_messages(msgs, "You are helpful.")
    assert out[0] == ("system", "You are helpful.")
    assert out[1] == ("human", "hi")
    assert out[2] == ("ai", "yo")


def test_role_mapping_default_system_prompt():
    msgs = [{"role": "user", "content": "hi"}]
    out = providers.to_lc_messages(msgs)
    assert out[0] == ("system", "You are a helpful assistant.")
    assert out[1] == ("human", "hi")


def test_unknown_provider_raises():
    with pytest.raises(ValueError):
        providers.get_chat_model("cohere", "x", "key")


@pytest.mark.parametrize("name", ["groq", "openai", "anthropic"])
def test_returns_model_for_supported(name):
    model = providers.get_chat_model(name, "some-model", "test-key")
    assert model is not None
