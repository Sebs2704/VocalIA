from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URI: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Email — Gmail SMTP
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

settings = Settings()
