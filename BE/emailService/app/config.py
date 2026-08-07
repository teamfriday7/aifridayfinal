from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    APP_NAME: str = "CodeGuardian Notification Service"

    RESEND_API_KEY: str
    SLACK_BOT_TOKEN: str
    SLACK_CHANNEL: str

    VERIFY_SSL: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()