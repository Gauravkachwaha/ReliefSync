from __future__ import annotations

import hashlib
import os
import threading
from typing import Any

from sentence_transformers import SentenceTransformer

from services.cache_service import cache_service


DEFAULT_MODEL_NAME = "intfloat/multilingual-e5-small"


class EmbeddingModelService:
    def __init__(self) -> None:
        self.model_name = os.getenv(
            "EMBEDDING_MODEL_NAME",
            DEFAULT_MODEL_NAME,
        )

        self.enabled = (
            os.getenv("EMBEDDING_MODEL_ENABLED", "true")
            .strip()
            .lower()
            == "true"
        )

        self._model: SentenceTransformer | None = None
        self._load_error: str | None = None
        self._lock = threading.Lock()

    def normalize_text(self, text: str) -> str:
        return " ".join(str(text).split())

    def get_text_hash(self, text: str) -> str:
        return hashlib.sha256(
            text.encode("utf-8")
        ).hexdigest()

    def get_cache_payload(
        self,
        clean_text: str,
    ) -> dict[str, str]:
        # Raw complaint text is not placed in the Redis key.
        return {
            "modelName": self.model_name,
            "inputFormat": "query_prefix_v1",
            "normalizedTextSha256": self.get_text_hash(clean_text),
        }

    def get_cache_ttl_seconds(self) -> int:
        return cache_service.get_positive_int_env(
            "EMBEDDING_CACHE_TTL_SECONDS",
            604800,
            60 * 60 * 24 * 30,
        )

    def ensure_loaded(self) -> None:
        if not self.enabled:
            raise RuntimeError("Embedding model is disabled")

        if self._model is not None:
            return

        with self._lock:
            if self._model is not None:
                return

            try:
                self._model = SentenceTransformer(
                    self.model_name,
                    device="cpu",
                )

                self._load_error = None

                print(
                    "✅ Embedding model loaded successfully: "
                    f"{self.model_name}"
                )

            except Exception as error:
                self._load_error = str(error)

                raise RuntimeError(
                    f"Could not load embedding model: {error}"
                ) from error

    def get_health(self) -> dict[str, Any]:
        try:
            self.ensure_loaded()

            cache_health = cache_service.get_health()

            return {
                "status": "ready",
                "enabled": self.enabled,
                "modelName": self.model_name,
                "device": "cpu",
                "embeddingDimension": (
                    self._model.get_sentence_embedding_dimension()
                ),
                "cacheStatus": cache_health["status"],
                "loadError": None,
            }

        except Exception:
            return {
                "status": "unavailable",
                "enabled": self.enabled,
                "modelName": self.model_name,
                "device": "cpu",
                "embeddingDimension": None,
                "cacheStatus": cache_service.get_health()[
                    "status"
                ],
                "loadError": self._load_error
                or "Embedding model could not be loaded",
            }

    def create_semantic_embedding(
        self,
        text: str,
    ) -> dict[str, Any]:
        clean_text = self.normalize_text(text)

        if len(clean_text) < 3:
            raise ValueError(
                "Text must contain at least 3 non-space characters"
            )

        cache_payload = self.get_cache_payload(clean_text)

        cached_result = cache_service.get_json(
            "embeddings",
            cache_payload,
        )

        if cached_result is not None:
            print("⚡ Embedding-model cache hit")

            return {
                **cached_result,
                "cacheHit": True,
            }

        self.ensure_loaded()

        # E5 works best when the input uses this prefix.
        model_input = f"query: {clean_text}"

        embedding = self._model.encode(
            model_input,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )

        result = {
            "modelName": self.model_name,
            "embeddingDimension": int(len(embedding)),
            "embedding": embedding.astype(float).tolist(),
        }

        cache_was_saved = cache_service.set_json(
            "embeddings",
            cache_payload,
            result,
            ttl_seconds=self.get_cache_ttl_seconds(),
        )

        if cache_was_saved:
            print(
                "💾 Embedding-model result saved to Redis cache"
            )

        return {
            **result,
            "cacheHit": False,
        }


embedding_model_service = EmbeddingModelService()