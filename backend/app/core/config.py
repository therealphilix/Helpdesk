from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    CORS_ORIGINS: str
    SESSION_EXPIRE_HOURS: int = 24
    ENVIRONMENT: str = "development"
    RESEND_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    model_config = {"env_file": "../.env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @model_validator(mode="after")
    def _assert_secret_key(self) -> "Settings":
        if self.SECRET_KEY == "change-me-in-production":
            raise ValueError("SECRET_KEY must be changed. Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\"")
        return self


settings = Settings()
