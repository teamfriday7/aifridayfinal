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


def send_security_alert(repository, risk_score, severity, issue):

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "🚨 CodeGuardian Security Alert"
            }
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": f"*Repository:*\n{repository}"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Risk Score:*\n{risk_score}/100"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Severity:*\n{severity}"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Issue:*\n{issue}"
                }
            ]
        }
    ]

    try:
        response = client.chat_postMessage(
            channel=settings.SLACK_CHANNEL,
            text="Security Alert",
            blocks=blocks
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