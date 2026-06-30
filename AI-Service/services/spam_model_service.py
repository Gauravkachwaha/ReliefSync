from __future__ import annotations

import hashlib
import os
import threading
from typing import Any

import torch
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
)

from services.cache_service import cache_service


DEFAULT_MODEL_NAME = (
    "mrm8488/bert-tiny-finetuned-sms-spam-detection"
)


class SpamModelService:
    def __init__(self) -> None:
        self.model_name = os.getenv(
            "SPAM_MODEL_NAME",
            DEFAULT_MODEL_NAME,
        )

        self.enabled = (
            os.getenv("SPAM_MODEL_ENABLED", "true")
            .strip()
            .lower()
            == "true"
        )

        self.spam_label = os.getenv(
            "SPAM_MODEL_SPAM_LABEL",
            "LABEL_1",
        ).strip()

        self._tokenizer: Any | None = None
        self._model: Any | None = None
        self._load_error: str | None = None
        self._lock = threading.Lock()

    def normalize_text(self, text: str) -> str:
        return " ".join(str(text).split())

    def get_text_hash(self, text: str) -> str:
        return hashlib.sha256(
            text.encode("utf-8")
        ).hexdigest()

    def get_cache_payload(self, clean_text: str) -> dict[str, str]:
        # Redis never receives raw complaint text in its key payload.
        return {
            "modelName": self.model_name,
            "configuredSpamLabel": self.spam_label,
            "normalizedTextSha256": self.get_text_hash(clean_text),
        }

    def get_cache_ttl_seconds(self) -> int:
        return cache_service.get_positive_int_env(
            "SPAM_CACHE_TTL_SECONDS",
            86400,
            60 * 60 * 24 * 30,
        )

    def ensure_loaded(self) -> None:
        if not self.enabled:
            raise RuntimeError("Spam model is disabled")

        if self._tokenizer is not None and self._model is not None:
            return

        with self._lock:
            if (
                self._tokenizer is not None
                and self._model is not None
            ):
                return

            try:
                self._tokenizer = AutoTokenizer.from_pretrained(
                    self.model_name
                )

                self._model = (
                    AutoModelForSequenceClassification.from_pretrained(
                        self.model_name
                    )
                )

                self._model.eval()
                self._load_error = None

                print(
                    "✅ Spam model loaded successfully: "
                    f"{self.model_name}"
                )

            except Exception as error:
                self._tokenizer = None
                self._model = None
                self._load_error = str(error)

                raise RuntimeError(
                    f"Could not load spam model: {error}"
                ) from error

    def get_label_map(self) -> dict[int, str]:
        self.ensure_loaded()

        raw_label_map = getattr(
            self._model.config,
            "id2label",
            {},
        )

        label_map: dict[int, str] = {}

        for index, label in dict(raw_label_map).items():
            try:
                label_map[int(index)] = str(label)
            except (TypeError, ValueError):
                continue

        if not label_map:
            raise RuntimeError(
                "Spam model does not provide an id2label mapping"
            )

        return label_map

    def get_spam_label_index(
        self,
        label_map: dict[int, str],
    ) -> int:
        expected_label = self.spam_label.casefold()

        for index, label in label_map.items():
            if label.casefold() == expected_label:
                return index

        available_labels = ", ".join(label_map.values())

        raise RuntimeError(
            "Configured SPAM_MODEL_SPAM_LABEL "
            f"'{self.spam_label}' was not found. "
            f"Available labels: {available_labels}"
        )

    def get_health(self) -> dict[str, Any]:
        try:
            self.ensure_loaded()

            label_map = self.get_label_map()
            spam_label_index = self.get_spam_label_index(
                label_map
            )

            cache_health = cache_service.get_health()

            return {
                "status": "ready",
                "enabled": self.enabled,
                "modelName": self.model_name,
                "device": "cpu",
                "labelMap": label_map,
                "configuredSpamLabel": self.spam_label,
                "configuredSpamLabelIndex": spam_label_index,
                "cacheStatus": cache_health["status"],
                "loadError": None,
            }

        except Exception as error:
            return {
                "status": "unavailable",
                "enabled": self.enabled,
                "modelName": self.model_name,
                "device": "cpu",
                "labelMap": {},
                "configuredSpamLabel": self.spam_label,
                "configuredSpamLabelIndex": None,
                "cacheStatus": cache_service.get_health()[
                    "status"
                ],
                "loadError": str(error),
            }

    def predict(self, text: str) -> dict[str, Any]:
        clean_text = self.normalize_text(text)

        if len(clean_text) < 3:
            raise ValueError(
                "Text must contain at least 3 non-space characters"
            )

        cache_payload = self.get_cache_payload(clean_text)

        cached_result = cache_service.get_json(
            "spam",
            cache_payload,
        )

        if cached_result is not None:
            print("⚡ Spam-model cache hit")

            return {
                **cached_result,
                "cacheHit": True,
            }

        self.ensure_loaded()

        label_map = self.get_label_map()
        spam_label_index = self.get_spam_label_index(
            label_map
        )

        model_inputs = self._tokenizer(
            clean_text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
        )

        with torch.no_grad():
            model_outputs = self._model(**model_inputs)

        probabilities = torch.softmax(
            model_outputs.logits[0],
            dim=-1,
        )

        predicted_index = int(
            torch.argmax(probabilities).item()
        )

        predicted_label = label_map.get(
            predicted_index,
            str(predicted_index),
        )

        spam_probability = float(
            probabilities[spam_label_index].item()
        )

        raw_score = float(
            probabilities[predicted_index].item()
        )

        result = {
            "modelName": self.model_name,
            "classification": (
                "SPAM"
                if predicted_label.casefold()
                == self.spam_label.casefold()
                else "HAM"
            ),
            "spamProbability": round(spam_probability, 6),
            "rawLabel": predicted_label,
            "rawScore": round(raw_score, 6),
            "configuredSpamLabel": self.spam_label,
        }

        cache_was_saved = cache_service.set_json(
            "spam",
            cache_payload,
            result,
            ttl_seconds=self.get_cache_ttl_seconds(),
        )

        if cache_was_saved:
            print("💾 Spam-model result saved to Redis cache")

        return {
            **result,
            "cacheHit": False,
        }


spam_model_service = SpamModelService()