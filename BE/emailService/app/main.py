from fastapi import FastAPI

from app.routers.notification import router



app = FastAPI(
    title="CodeGuardian Notification Service"
)



app.include_router(
    router,
    prefix="/notifications"
)



@app.get("/")
def home():

    return {

        "service": "CodeGuardian Notification Service",

        "status": "running"

    }