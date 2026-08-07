import logging
import os
import httpx

logger = logging.getLogger("notifications")

NOTIFICATION_SERVICE_URL = os.environ.get("NOTIFICATION_SERVICE_URL", "http://localhost:8002")

async def send_review_email(to_email: str, repository: str, risk_score: float):
    """Hits the separate emailService microservice to send an email."""
    url = f"{NOTIFICATION_SERVICE_URL}/notifications/email"
    payload = {
        "email": to_email,
        "repository": repository,
        "risk_score": int(risk_score)
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=10.0)
            resp.raise_for_status()
            logger.info("Triggered email notification via %s", url)
    except Exception as e:
        logger.error("Failed to trigger email notification via service: %s", e)


async def send_slack_notification(repository: str, risk_score: float, issues_count: int, critical_count: int):
    """Hits the separate emailService microservice to send a slack notification."""
    url = f"{NOTIFICATION_SERVICE_URL}/notifications/slack"
    message = f"🚨 *CodeGuardian Review Complete*\n*Repository:* {repository}\n*Score:* {risk_score}/100\n*Findings:* {issues_count} total, {critical_count} critical/high.\nCheck the dashboard to review suggested fixes."
    payload = {
        "message": message
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=10.0)
            resp.raise_for_status()
            logger.info("Triggered Slack notification via %s", url)
    except Exception as e:
        logger.error("Failed to trigger Slack notification via service: %s", e)
