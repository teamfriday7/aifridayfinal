from fastapi import APIRouter


from app.models.notification import EmailRequest

from app.services.email_service import send_email

from app.models.notification import SlackRequest
from app.services.slack_service import send_slack_message

from app.models.notification import SecurityAlertRequest
from app.services.slack_service import send_security_alert



router = APIRouter()



@router.post("/email")
def email_notification(
    request: EmailRequest
):

    html = f"""

    <html>

    <body>

    <h2>
    🚀 CodeGuardian AI Review Completed
    </h2>


    <p>
    Repository:
    {request.repository}
    </p>


    <p>
    Risk Score:
    <b>{request.risk_score}</b>
    </p>


    </body>

    </html>

    """


    response = send_email(

        request.email,

        "CodeGuardian AI Review Completed",

        html

    )


    return {

        "status": "email sent",

        "response": response

    }

@router.post("/slack")
def slack_notification(request: SlackRequest):

    return send_slack_message(request.message)

@router.post("/security-alert")
def security_alert(request: SecurityAlertRequest):

    return send_security_alert(

        repository=request.repository,

        risk_score=request.risk_score,

        severity=request.severity,

        issue=request.issue,

    )