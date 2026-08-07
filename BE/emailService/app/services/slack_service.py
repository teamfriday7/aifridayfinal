from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

from app.config import settings


client = WebClient(token=settings.SLACK_BOT_TOKEN)


def send_slack_message(message: str):

    try:
        response = client.chat_postMessage(
            channel=settings.SLACK_CHANNEL,
            text=message
        )

        return {
            "status": "success",
            "ts": response["ts"]
        }

    except SlackApiError as e:
        return {
            "status": "error",
            "error": e.response["error"]
        }