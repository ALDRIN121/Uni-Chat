from app.core import crypto

def test_roundtrip(monkeypatch):
    key = crypto.generate_key()
    monkeypatch.setattr(crypto, "_get_key", lambda: key)
    token = crypto.encrypt("sk-secret-123")
    assert token != "sk-secret-123"
    assert crypto.decrypt(token) == "sk-secret-123"

def test_empty_is_none():
    assert crypto.encrypt(None) is None
    assert crypto.decrypt(None) is None
