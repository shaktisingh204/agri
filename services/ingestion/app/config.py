from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Agri PDF Ingestion Service"
    ingestion_api_token: str = "change-me"
    backend_sync_url: str = "http://localhost:3000/api/admin/uploads/ingestion"
    backend_commit_url: str = "http://localhost:3000/api/admin/uploads/commit"
    staging_dir: str = "/tmp/agri-ingestion-staging"


settings = Settings()
