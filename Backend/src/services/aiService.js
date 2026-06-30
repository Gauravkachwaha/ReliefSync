import axios from "axios";

import aiWorkflowCacheService from "./aiWorkflowCacheService.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || "";

const AI_SERVICE_TIMEOUT_MS =
  Number(process.env.AI_SERVICE_TIMEOUT_MS) || 30000;

const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: AI_SERVICE_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    "X-Service-Key": AI_SERVICE_API_KEY,
  },
});

class AiService {
  normalizeForCache(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  getTtl(name, defaultValue) {
    const value = Number.parseInt(process.env[name], 10);

    if (!Number.isInteger(value) || value < 1) {
      return defaultValue;
    }

    return Math.min(value, 60 * 60 * 24 * 30);
  }

  getServiceError(error, action) {
    const detail =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "Unknown AI service error";

    const serviceError = new Error(`AI service could not ${action}: ${detail}`);

    serviceError.status = 503;

    return serviceError;
  }

  async extractStructuredData(rawText, locationHint = null) {
    const normalizedText = this.normalizeForCache(rawText);

    const normalizedLocation = this.normalizeForCache(locationHint);

    const cachePayload = {
      cacheVersion: "rule_extraction_v1",
      textSha256: aiWorkflowCacheService.hashText(normalizedText),
      locationHintSha256: aiWorkflowCacheService.hashText(normalizedLocation),
    };

    return await aiWorkflowCacheService.getOrCompute({
      namespace: "rule-extraction",
      payload: cachePayload,
      ttlSeconds: this.getTtl("AI_EXTRACTION_CACHE_TTL_SECONDS", 21600),
      compute: async () => {
        try {
          const response = await aiClient.post("/internal/complaints/extract", {
            text: rawText,
            locationHint,
          });

          const data = response.data || {};

          return {
            ...data,
            location: data.location || locationHint || null,
            issueType: data.issueType || data.category || "GENERAL_SUPPORT",
            affectedPeople: Math.max(
              1,
              Number.parseInt(
                data.affectedPeople || data.requiredPeople || 1,
                10,
              ) || 1,
            ),
            urgencyHint: data.urgencyHint || data.severity || "MEDIUM",
            requiredSkills: Array.isArray(data.requiredSkills)
              ? data.requiredSkills
              : [],
            requiredVolunteers: Math.max(
              1,
              Number.parseInt(
                data.requiredVolunteers || data.requiredPeople || 1,
                10,
              ) || 1,
            ),
          };
        } catch (error) {
          throw this.getServiceError(error, "extract complaint information");
        }
      },
    });
  }

  async calculatePriority(title, rawText, aiExtractedData) {
    const cachePayload = {
      cacheVersion: "priority_v1",
      titleSha256: aiWorkflowCacheService.hashText(
        this.normalizeForCache(title),
      ),
      rawTextSha256: aiWorkflowCacheService.hashText(
        this.normalizeForCache(rawText),
      ),
      extractedDataSha256: aiWorkflowCacheService.hashObject(
        aiExtractedData || {},
      ),
    };

    return await aiWorkflowCacheService.getOrCompute({
      namespace: "priority",
      payload: cachePayload,
      ttlSeconds: this.getTtl("AI_PRIORITY_CACHE_TTL_SECONDS", 21600),
      compute: async () => {
        try {
          const response = await aiClient.post(
            "/internal/complaints/priority",
            {
              title,
              rawText,
              aiExtractedData,
            },
          );

          return response.data;
        } catch (error) {
          throw this.getServiceError(error, "calculate complaint priority");
        }
      },
    });
  }

  async generateNeedSummary(title, priority, extractedData) {
    const cachePayload = {
      cacheVersion: "summary_v1",
      titleSha256: aiWorkflowCacheService.hashText(
        this.normalizeForCache(title),
      ),
      prioritySha256: aiWorkflowCacheService.hashObject(priority || {}),
      extractedDataSha256: aiWorkflowCacheService.hashObject(
        extractedData || {},
      ),
    };

    return await aiWorkflowCacheService.getOrCompute({
      namespace: "need-summary",
      payload: cachePayload,
      ttlSeconds: this.getTtl("AI_SUMMARY_CACHE_TTL_SECONDS", 21600),
      compute: async () => {
        try {
          const response = await aiClient.post("/internal/needs/summary", {
            title,
            priority,
            extractedData,
          });

          return response.data;
        } catch (error) {
          throw this.getServiceError(error, "generate need summary");
        }
      },
    });
  }

  async predictSpamInShadowMode(text) {
    try {
      const response = await aiClient.post("/internal/ml/spam/predict", {
        text,
      });

      return response.data;
    } catch (error) {
      throw this.getServiceError(error, "score spam with the ML model");
    }
  }

  async createSemanticEmbedding(text) {
    try {
      const response = await aiClient.post("/internal/ml/embeddings/encode", {
        text,
      });

      return response.data;
    } catch (error) {
      throw this.getServiceError(error, "create semantic embedding");
    }
  }

  async classifyComplaintInShadowMode(text) {
    try {
      const response = await aiClient.post(
        "/internal/ml/complaint-classifier/predict",
        {
          text,
        },
      );

      return response.data;
    } catch (error) {
      throw this.getServiceError(
        error,
        "classify complaint category and severity",
      );
    }
  }

  async pingFastApiService() {
    try {
      const response = await aiClient.get("/internal/ping");

      return response.data;
    } catch (error) {
      throw this.getServiceError(error, "reach FastAPI service");
    }
  }
}

export default new AiService();
