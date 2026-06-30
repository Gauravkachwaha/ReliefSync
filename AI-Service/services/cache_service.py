from __future__ import annotations

import hashlib
import json
import os
import time
from typing import Any
from urllib.parse import urlparse

import redis
from redis.exceptions import RedisError


class RedisCacheService:
    def __init__(self) -> None:
        self.enabled = (
            os.getenv("REDIS_CACHE_ENABLED", "true")
            .strip()
            .lower()
            == "true"
        )

        self.redis_url = os.getenv(
            "REDIS_URL",
            "redis://127.0.0.1:6379/0",
        )

        self.key_prefix = os.getenv(
            "REDIS_KEY_PREFIX",
            "reliefsync:ai:v1",
        ).strip()

        self.connect_timeout = float(
            os.getenv("REDIS_CONNECT_TIMEOUT_SECONDS", "2")
        )

        self.socket_timeout = float(
            os.getenv("REDIS_SOCKET_TIMEOUT_SECONDS", "2")
        )

        self.default_ttl_seconds = self.get_positive_int_env(
            "REDIS_CACHE_DEFAULT_TTL_SECONDS",
            3600,
            60 * 60 * 24 * 30,
        )

        self._client: redis.Redis | None = None
        self._last_error: str | None = None
        self._last_connection_attempt = 0.0
        self._retry_delay_seconds = 5.0

    def get_positive_int_env(
        self,
        name: str,
        default_value: int,
        maximum_value: int,
    ) -> int:
        try:
            value = int(os.getenv(name, str(default_value)))
        except ValueError:
            return default_value

        if value < 1:
            return default_value

        return min(value, maximum_value)

    def get_safe_redis_url(self) -> str:
        parsed_url = urlparse(self.redis_url)

        host = parsed_url.hostname or "unknown-host"
        port = parsed_url.port or 6379
        database = parsed_url.path or "/0"

        return f"{parsed_url.scheme}://{host}:{port}{database}"

    def get_cache_key(
        self,
        namespace: str,
        payload: dict[str, Any],
    ) -> str:
        serialized_payload = json.dumps(
            payload,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )

        payload_hash = hashlib.sha256(
            serialized_payload.encode("utf-8")
        ).hexdigest()

        return (
            f"{self.key_prefix}:{namespace}:{payload_hash}"
        )

    def get_client(self) -> redis.Redis | None:
        if not self.enabled:
            return None

        if self._client is not None:
            return self._client

        current_time = time.monotonic()

        if (
            current_time - self._last_connection_attempt
            < self._retry_delay_seconds
        ):
            return None

        self._last_connection_attempt = current_time

        try:
            client = redis.Redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_connect_timeout=self.connect_timeout,
                socket_timeout=self.socket_timeout,
                health_check_interval=30,
            )

            client.ping()

            self._client = client
            self._last_error = None

            print(
                "✅ Redis cache connected: "
                f"{self.get_safe_redis_url()}"
            )

            return self._client

        except RedisError as error:
            self._client = None
            self._last_error = str(error)

            print(
                "⚠️ Redis cache unavailable. "
                "FastAPI will continue without caching."
            )

            return None

    def get_json(
        self,
        namespace: str,
        payload: dict[str, Any],
    ) -> dict[str, Any] | None:
        client = self.get_client()

        if client is None:
            return None

        cache_key = self.get_cache_key(namespace, payload)

        try:
            cached_value = client.get(cache_key)

            if not cached_value:
                return None

            parsed_value = json.loads(cached_value)

            if not isinstance(parsed_value, dict):
                return None

            return parsed_value

        except (RedisError, json.JSONDecodeError) as error:
            self._client = None
            self._last_error = str(error)

            return None

    def set_json(
        self,
        namespace: str,
        payload: dict[str, Any],
        value: dict[str, Any],
        ttl_seconds: int | None = None,
    ) -> bool:
        client = self.get_client()

        if client is None:
            return False

        cache_key = self.get_cache_key(namespace, payload)

        ttl = (
            ttl_seconds
            if isinstance(ttl_seconds, int) and ttl_seconds > 0
            else self.default_ttl_seconds
        )

        try:
            serialized_value = json.dumps(
                value,
                ensure_ascii=False,
                separators=(",", ":"),
            )

            client.set(cache_key, serialized_value, ex=ttl)

            return True

        except (RedisError, TypeError, ValueError) as error:
            self._client = None
            self._last_error = str(error)

            return False

    def get_health(self) -> dict[str, Any]:
        if not self.enabled:
            return {
                "status": "disabled",
                "enabled": False,
                "redisUrl": self.get_safe_redis_url(),
                "keyPrefix": self.key_prefix,
                "defaultTtlSeconds": self.default_ttl_seconds,
                "lastError": None,
            }

        client = self.get_client()

        if client is None:
            return {
                "status": "unavailable",
                "enabled": True,
                "redisUrl": self.get_safe_redis_url(),
                "keyPrefix": self.key_prefix,
                "defaultTtlSeconds": self.default_ttl_seconds,
                "lastError": self._last_error,
            }

        try:
            client.ping()

            return {
                "status": "ready",
                "enabled": True,
                "redisUrl": self.get_safe_redis_url(),
                "keyPrefix": self.key_prefix,
                "defaultTtlSeconds": self.default_ttl_seconds,
                "lastError": None,
            }

        except RedisError as error:
            self._client = None
            self._last_error = str(error)

            return {
                "status": "unavailable",
                "enabled": True,
                "redisUrl": self.get_safe_redis_url(),
                "keyPrefix": self.key_prefix,
                "defaultTtlSeconds": self.default_ttl_seconds,
                "lastError": self._last_error,
            }

    def close(self) -> None:
        if self._client is None:
            return

        try:
            self._client.close()
        except RedisError:
            pass
        finally:
            self._client = None


cache_service = RedisCacheService()