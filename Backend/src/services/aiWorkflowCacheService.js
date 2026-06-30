import crypto from "crypto";
import { createClient } from "redis";

class AiWorkflowCacheService {
  constructor() {
    this.client = null;
    this.connectionPromise = null;
    this.lastConnectionAttemptAt = 0;
    this.lastError = null;
  }

  isEnabled() {
    return (
      String(process.env.BACKEND_REDIS_CACHE_ENABLED || "true")
        .trim()
        .toLowerCase() === "true"
    );
  }

  getPositiveIntegerEnv(name, defaultValue, maxValue) {
    const value = Number.parseInt(process.env[name], 10);

    if (!Number.isInteger(value) || value < 1) {
      return defaultValue;
    }

    return Math.min(value, maxValue);
  }

  getRedisUrl() {
    return process.env.BACKEND_REDIS_URL || "redis://127.0.0.1:6379/0";
  }

  getKeyPrefix() {
    return (
      process.env.BACKEND_REDIS_KEY_PREFIX || "reliefsync:backend:v1"
    ).replace(/:+$/, "");
  }

  stableStringify(value) {
    if (value === undefined) {
      return "null";
    }

    if (value === null || typeof value !== "object") {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(",")}]`;
    }

    const sortedKeys = Object.keys(value).sort();

    return `{${sortedKeys
      .map(
        (key) => `${JSON.stringify(key)}:${this.stableStringify(value[key])}`,
      )
      .join(",")}}`;
  }

  hashText(value) {
    return crypto
      .createHash("sha256")
      .update(String(value || ""), "utf8")
      .digest("hex");
  }

  hashObject(value) {
    return crypto
      .createHash("sha256")
      .update(this.stableStringify(value), "utf8")
      .digest("hex");
  }

  getCacheKey(namespace, payload) {
    const payloadHash = this.hashObject(payload);

    return `${this.getKeyPrefix()}:${namespace}:${payloadHash}`;
  }

  async getClient() {
    if (!this.isEnabled()) {
      return null;
    }

    if (this.client?.isReady) {
      return this.client;
    }

    // A client already trying to reconnect should not receive
    // a second connect() call.
    if (this.client?.isOpen) {
      return null;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    const now = Date.now();

    // Avoid retrying Redis on every single request if it is down.
    if (now - this.lastConnectionAttemptAt < 5000) {
      return null;
    }

    this.lastConnectionAttemptAt = now;

    const connectTimeout = this.getPositiveIntegerEnv(
      "BACKEND_REDIS_CONNECT_TIMEOUT_MS",
      2000,
      30000,
    );

    const client = createClient({
      url: this.getRedisUrl(),
      socket: {
        connectTimeout,
        reconnectStrategy: false,
      },
    });

    client.on("error", (error) => {
      this.lastError = error.message;
    });

    this.client = client;

    this.connectionPromise = (async () => {
      try {
        await client.connect();

        this.lastError = null;

        console.log("✅ Backend Redis workflow cache connected");

        return client;
      } catch (error) {
        this.lastError = error.message;
        this.client = null;

        console.warn(
          "⚠️ Backend Redis cache unavailable. FastAPI calls will continue normally.",
        );

        return null;
      } finally {
        this.connectionPromise = null;
      }
    })();

    return this.connectionPromise;
  }

  async getJson(namespace, payload) {
    const client = await this.getClient();

    if (!client) {
      return null;
    }

    const cacheKey = this.getCacheKey(namespace, payload);

    try {
      const cachedValue = await client.get(cacheKey);

      if (!cachedValue) {
        return null;
      }

      return JSON.parse(cachedValue);
    } catch (error) {
      this.lastError = error.message;

      return null;
    }
  }

  async setJson(namespace, payload, value, ttlSeconds) {
    const client = await this.getClient();

    if (!client) {
      return false;
    }

    const cacheKey = this.getCacheKey(namespace, payload);

    try {
      await client.set(cacheKey, JSON.stringify(value), {
        EX: ttlSeconds,
      });

      return true;
    } catch (error) {
      this.lastError = error.message;

      return false;
    }
  }

  async getOrCompute({ namespace, payload, ttlSeconds, compute }) {
    const cachedValue = await this.getJson(namespace, payload);

    if (cachedValue !== null) {
      console.log(`⚡ Backend workflow cache hit: ${namespace}`);

      return cachedValue;
    }

    const computedValue = await compute();

    const cacheWasSaved = await this.setJson(
      namespace,
      payload,
      computedValue,
      ttlSeconds,
    );

    if (cacheWasSaved) {
      console.log(`💾 Backend workflow result saved: ${namespace}`);
    }

    return computedValue;
  }
}

export default new AiWorkflowCacheService();
