import hmac
import os

from fastapi import APIRouter, Header, HTTPException, status

from services.cache_service import cache_service


router = APIRouter(
    prefix="/internal/cache",
    tags=["Redis Cache"],
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
def get_cache_health(
    x_service_key: str | None = Header(default=None),
):
    verify_service_key(x_service_key)

    cache_health = cache_service.get_health()

    if cache_health["status"] == "unavailable":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=cache_health,
        )

    return cache_health