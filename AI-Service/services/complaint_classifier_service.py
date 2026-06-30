from __future__ import annotations

import hashlib
import os
import threading
from typing import Any

from transformers import pipeline

from services.cache_service import cache_service


DEFAULT_MODEL_NAME = (
    "MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7"
)


CATEGORY_LABELS = {
    "MEDICAL_SUPPORT": "medical assistance or first aid",
    "FOOD_RELIEF": "food, water, or essential supplies",
    "SHELTER_SUPPORT": "temporary shelter or accommodation",
    "DISASTER_RELIEF": (
        "disaster relief after flood, fire, earthquake, or storm"
    ),
    "WOMEN_CHILD_SAFETY": "women or child safety",
    "CIVIC_GRIEVANCE": (
        "civic infrastructure or public service problem"
    ),
    "GENERAL_SUPPORT": "general community support",
}


SEVERITY_LABELS = {
    "CRITICAL": (
        "critical life-threatening emergency requiring immediate action"
    ),
    "HIGH": "high priority urgent relief need",
    "MEDIUM": "medium priority support need",
    "LOW": "low priority non-urgent support need",
}


CATEGORY_TEMPLATE = (
    "This complaint is primarily about {}."
)

SEVERITY_TEMPLATE = (
    "The urgency level of this complaint is {}."
)


class ComplaintClassifierService:
    def __init__(self) -> None:
        self.model_name = os.getenv(
            "COMPLAINT_CLASSIFIER_MODEL_NAME",
            DEFAULT_MODEL_NAME,
        )

        self.enabled = (
            os.getenv("COMPLAINT_CLASSIFIER_ENABLED", "true")
            .strip()
            .lower()
            == "true"
        )

        self._classifier = None
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
    ) -> dict[str, Any]:
        # Redis key payload contains only a text hash, never raw complaint text.
        return {
            "cacheVersion": "complaint_classifier_v1",
            "modelName": self.model_name,
            "normalizedTextSha256": self.get_text_hash(clean_text),
            "categoryLabels": CATEGORY_LABELS,
            "severityLabels": SEVERITY_LABELS,
            "categoryTemplate": CATEGORY_TEMPLATE,
            "severityTemplate": SEVERITY_TEMPLATE,
        }

    def get_cache_ttl_seconds(self) -> int:
        return cache_service.get_positive_int_env(
            "CLASSIFIER_CACHE_TTL_SECONDS",
            86400,
            60 * 60 * 24 * 30,
        )

    def ensure_loaded(self) -> None:
        if not self.enabled:
            raise RuntimeError("Complaint classifier is disabled")

        if self._classifier is not None:
            return

        with self._lock:
            if self._classifier is not None:
                return

            try:
                self._classifier = pipeline(
                    task="zero-shot-classification",
                    model=self.model_name,
                    tokenizer=self.model_name,
                    device=-1,
                )

                self._load_error = None

                print(
                    "✅ Complaint classifier loaded successfully: "
                    f"{self.model_name}"
                )

            except Exception as error:
                self._load_error = str(error)

                raise RuntimeError(
                    f"Could not load complaint classifier: {error}"
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
                "cacheStatus": cache_health["status"],
                "loadError": None,
            }

        except Exception:
            return {
                "status": "unavailable",
                "enabled": self.enabled,
                "modelName": self.model_name,
                "device": "cpu",
                "cacheStatus": cache_service.get_health()[
                    "status"
                ],
                "loadError": self._load_error
                or "Complaint classifier could not be loaded",
            }

    def get_top_prediction(
        self,
        text: str,
        label_map: dict[str, str],
        hypothesis_template: str,
    ) -> dict[str, Any]:
        labels = list(label_map.values())

        result = self._classifier(
            text,
            candidate_labels=labels,
            multi_label=False,
            hypothesis_template=hypothesis_template,
            truncation=True,
        )

        predicted_label_text = result["labels"][0]
        confidence = float(result["scores"][0])

        internal_label = next(
            (
                key
                for key, value in label_map.items()
                if value == predicted_label_text
            ),
            "GENERAL_SUPPORT",
        )

        ranked_scores = []

        for label, score in zip(
            result["labels"],
            result["scores"],
        ):
            internal_code = next(
                (
                    key
                    for key, value in label_map.items()
                    if value == label
                ),
                label,
            )

            ranked_scores.append(
                {
                    "label": internal_code,
                    "description": label,
                    "score": round(float(score), 6),
                }
            )

        return {
            "label": internal_label,
            "confidence": round(confidence, 6),
            "rankedScores": ranked_scores,
        }

    def classify(self, text: str) -> dict[str, Any]:
        clean_text = self.normalize_text(text)

        if len(clean_text) < 3:
            raise ValueError(
                "Text must contain at least 3 non-space characters"
            )

        cache_payload = self.get_cache_payload(clean_text)

        cached_result = cache_service.get_json(
            "complaint-classifier",
            cache_payload,
        )

        if cached_result is not None:
            print("⚡ Complaint-classifier cache hit")

            return {
                **cached_result,
                "cacheHit": True,
            }

        self.ensure_loaded()

        category_result = self.get_top_prediction(
            text=clean_text,
            label_map=CATEGORY_LABELS,
            hypothesis_template=CATEGORY_TEMPLATE,
        )

        severity_result = self.get_top_prediction(
            text=clean_text,
            label_map=SEVERITY_LABELS,
            hypothesis_template=SEVERITY_TEMPLATE,
        )

        result = {
            "modelName": self.model_name,
            "category": category_result,
            "severity": severity_result,
            "shadowMode": True,
        }

        cache_was_saved = cache_service.set_json(
            "complaint-classifier",
            cache_payload,
            result,
            ttl_seconds=self.get_cache_ttl_seconds(),
        )

        if cache_was_saved:
            print(
                "💾 Complaint-classifier result saved to Redis cache"
            )

        return {
            **result,
            "cacheHit": False,
        }


complaint_classifier_service = ComplaintClassifierService()