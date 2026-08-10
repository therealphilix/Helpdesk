import os
from urllib.parse import urlparse

from arq.connections import RedisSettings as ArqRedisSettings
from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    CORS_ORIGINS: str
    SESSION_EXPIRE_HOURS: int = 24
    LOGIN_RATE_LIMIT: str = "5/minute"
    ENVIRONMENT: str = "development"
    RESEND_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.deepseek.com"
    OPENAI_MODEL: str = "deepseek-v4-flash"
    KNOWLEDGE_BASE_PATH: str = "../backend/knowledge-base.md"
    ANTHROPIC_API_KEY: str = ""
    WEBHOOK_SECRET: str = ""
    RESEND_WEBHOOK_SECRET: str = ""
    FROM_EMAIL: str = "Helpdesk <support@helpdesk.com>"
    SENTRY_DSN: str = ""

    model_config = {
        "env_file": os.getenv("ENV_FILE", "../.env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @model_validator(mode="after")
    def _normalize_database_url(self) -> "Settings":
        if self.DATABASE_URL.startswith("postgres://"):
            self.DATABASE_URL = self.DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
        elif self.DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in self.DATABASE_URL:
            self.DATABASE_URL = self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self

    @model_validator(mode="after")
    def _assert_secret_key(self) -> "Settings":
        if self.SECRET_KEY == "change-me-in-production":
            raise ValueError("SECRET_KEY must be changed. Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\"")
        return self

    def arq_redis_settings(self) -> ArqRedisSettings:
        parsed = urlparse(self.REDIS_URL)
        return ArqRedisSettings(
            host=parsed.hostname or "localhost",
            port=parsed.port or 6379,
            password=parsed.password or None,
            database=int(parsed.path.lstrip("/") or "0"),
        )


settings = Settings()
