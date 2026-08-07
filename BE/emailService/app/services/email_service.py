import httpx

from app.config import settings


def send_email(to_email, subject, html_content):

    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "from": "CodeGuardian <onboarding@resend.dev>",
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }

    with httpx.Client(
        verify=settings.VERIFY_SSL
    ) as client:

        response = client.post(
            "https://api.resend.com/emails",
            headers=headers,
            json=payload,
        )

    response.raise_for_status()

    return response.json()