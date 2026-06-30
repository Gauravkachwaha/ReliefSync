import hmac
import os

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from services.spam_model_service import spam_model_service


router = APIRouter(
    prefix="/internal/ml/spam",
    tags=["ML Spam Model"],
)


class SpamPredictionRequest(BaseModel):
    text: str = Field(
        min_length=3,
        max_length=5000,
        description="Complaint or message text to classify",
    )


def verify_service_key(
    x_service_key: str | None = Header(default=None),
) -> None:
    expected_key = os.getenv("AI_SERVICE_API_KEY", "").strip()

    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI_SERVICE_API_KEY is not configured",
        )

    if (
        not x_service_key
        or not hmac.compare_digest(x_service_key, expected_key)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid service key",
        )


@router.get("/health")
def get_spam_model_health(
    x_service_key: str | None = Header(default=None),
):
    verify_service_key(x_service_key)

    health = spam_model_service.get_health()

    if health["status"] != "ready":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=health,
        )

    return health


@router.post("/predict")
def predict_spam(
    payload: SpamPredictionRequest,
    x_service_key: str | None = Header(default=None),
):
    verify_service_key(x_service_key)

    try:
        return spam_model_service.predict(payload.text)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Spam model is temporarily unavailable. "
                "Check AI-Service terminal logs."
            ),
        ) from error