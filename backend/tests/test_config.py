import os
import importlib

def test_settings_reads_env(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "45")
    import app.core.config as config
    importlib.reload(config)
    assert config.settings.SECRET_KEY == "test-secret"
    assert config.settings.ACCESS_TOKEN_EXPIRE_MINUTES == 45
    assert isinstance(config.settings.CORS_ORIGINS, list)
