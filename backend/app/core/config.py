from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://helpdesk:helpdesk@localhost:5432/helpdesk"
    REDIS_URL: str = "redis://localhost:6379/0"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    SECRET_KEY: str = "change-me-in-production"
    RESEND_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
