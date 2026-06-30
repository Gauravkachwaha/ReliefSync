import hmac
import os

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from services.embedding_model_service import embedding_model_service


router = APIRouter(
    prefix="/internal/ml/embeddings",
    tags=["ML Embeddings"],
)


class EmbeddingRequest(BaseModel):
    text: str = Field(
        min_length=3,
        max_length=5000,
        description="Complaint text to convert into an embedding",
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
def get_embedding_model_health(
    x_service_key: str | None = Header(default=None),
):
    verify_service_key(x_service_key)

    health = embedding_model_service.get_health()

    if health["status"] != "ready":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=health,
        )

    return health


@router.post("/encode")
def create_embedding(
    payload: EmbeddingRequest,
    x_service_key: str | None = Header(default=None),
):
    verify_service_key(x_service_key)

    try:
        return embedding_model_service.create_semantic_embedding(
            payload.text
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Embedding model is temporarily unavailable. "
                "Check AI-Service terminal logs."
            ),
        ) from error