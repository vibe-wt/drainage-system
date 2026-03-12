from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Drainage System API"
    api_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5433/drainage_system"
    session_cookie_name: str = "drainage_session"
    session_ttl_hours: int = 12
    session_secure_cookies: bool = False
    seed_admin_email: str = "admin@drainage.local"
    seed_admin_password: str = "ChangeMe123!"
    seed_admin_name: str = "System Admin"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
