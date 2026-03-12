from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Drainage System API"
    api_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5433/drainage_system"
    cors_origins: list[str] = [
        "http://localhost:4173",
        "http://localhost:4174",
        "http://localhost:4175",
        "http://localhost:4176",
        "http://localhost:4177",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:4174",
        "http://127.0.0.1:4175",
        "http://127.0.0.1:4176",
        "http://127.0.0.1:4177",
        "http://0.0.0.0:4173",
        "http://0.0.0.0:4174",
        "http://0.0.0.0:4175",
        "http://0.0.0.0:4176",
        "http://0.0.0.0:4177",
    ]
    cors_origin_regex: str = r"http://(localhost|127\.0\.0\.1|0\.0\.0\.0):4\d{3}"
    session_cookie_name: str = "drainage_session"
    session_ttl_hours: int = 12
    session_secure_cookies: bool = False
    seed_admin_email: str = "admin@drainage.local"
    seed_admin_password: str = "ChangeMe123!"
    seed_admin_name: str = "System Admin"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value
        return [item.strip() for item in value.split(",") if item.strip()]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
