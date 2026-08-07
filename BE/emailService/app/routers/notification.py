from fastapi import APIRouter


from app.models.notification import EmailRequest

from app.services.email_service import send_email



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