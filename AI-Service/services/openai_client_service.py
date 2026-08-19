from __future__ import annotations

import json
import os
import threading
from typing import Any

from openai import OpenAI


DEFAULT_MODEL_NAME = "gpt-4o-mini"


class OpenAiClientService:
    def __init__(self) -> None:
        self.model_name = os.getenv("OPENAI_MODEL_NAME", DEFAULT_MODEL_NAME)
        self._client: OpenAI | None = None
        self._lock = threading.Lock()

    def is_configured(self) -> bool:
        return bool(os.getenv("OPENAI_API_KEY", "").strip())

    def get_client(self) -> OpenAI:
        if self._client is not None:
            return self._client

        with self._lock:
            if self._client is not None:
                return self._client

            api_key = os.getenv("OPENAI_API_KEY", "").strip()

            if not api_key:
                raise RuntimeError("OPENAI_API_KEY is not configured")

            self._client = OpenAI(api_key=api_key)

            return self._client

    def complete_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0,
    ) -> dict[str, Any]:
        client = self.get_client()

        response = client.chat.completions.create(
            model=self.model_name,
            temperature=temperature,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        content = response.choices[0].message.content or "{}"

        return json.loads(content)


openai_client_service = OpenAiClientService()
