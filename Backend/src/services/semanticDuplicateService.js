import aiService from "./aiService.js";
import complaintRepository from "../repositories/complaintRepository.js";

class SemanticDuplicateService {
  getBooleanEnv(name, defaultValue = false) {
    const value = process.env[name];

    if (value === undefined) {
      return defaultValue;
    }

    return String(value).trim().toLowerCase() === "true";
  }

  getPositiveIntegerEnv(name, defaultValue, maxValue) {
    const value = Number.parseInt(process.env[name], 10);

    if (!Number.isInteger(value) || value < 1) {
      return defaultValue;
    }

    return Math.min(value, maxValue);
  }

  getThreshold() {
    const threshold = Number(process.env.SEMANTIC_DUPLICATE_THRESHOLD);

    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
      return 0.88;
    }

    return threshold;
  }

  normalizeText(value = "") {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  buildEmbeddingText(text, locationHint) {
    const location = locationHint?.trim() || "Not provided";

    return [`Location: ${location}`, `Complaint: ${text.trim()}`].join("\n");
  }

  getLocationTokens(locationHint) {
    return this.normalizeText(locationHint)
      .split(" ")
      .filter((token) => token.length >= 4);
  }

  hasCompatibleLocation(firstLocation, secondLocation) {
    const firstTokens = this.getLocationTokens(firstLocation);
    const secondTokens = this.getLocationTokens(secondLocation);

    if (firstTokens.length === 0 || secondTokens.length === 0) {
      return false;
    }

    const firstNormalized = firstTokens.join(" ");
    const secondNormalized = secondTokens.join(" ");

    if (
      firstNormalized === secondNormalized ||
      firstNormalized.includes(secondNormalized) ||
      secondNormalized.includes(firstNormalized)
    ) {
      return true;
    }

    const secondTokenSet = new Set(secondTokens);

    const commonTokens = firstTokens.filter((token) =>
      secondTokenSet.has(token),
    );

    // One shared detailed area token is enough:
    // Example: "Aliganj Lucknow" and "Aliganj".
    return commonTokens.length >= 1;
  }

  cosineSimilarity(firstVector, secondVector) {
    if (
      !Array.isArray(firstVector) ||
      !Array.isArray(secondVector) ||
      firstVector.length === 0 ||
      firstVector.length !== secondVector.length
    ) {
      return null;
    }

    let dotProduct = 0;
    let firstMagnitude = 0;
    let secondMagnitude = 0;

    for (let index = 0; index < firstVector.length; index += 1) {
      const firstValue = Number(firstVector[index]);
      const secondValue = Number(secondVector[index]);

      if (!Number.isFinite(firstValue) || !Number.isFinite(secondValue)) {
        return null;
      }

      dotProduct += firstValue * secondValue;
      firstMagnitude += firstValue * firstValue;
      secondMagnitude += secondValue * secondValue;
    }

    if (firstMagnitude === 0 || secondMagnitude === 0) {
      return null;
    }

    return dotProduct / Math.sqrt(firstMagnitude * secondMagnitude);
  }

  getDefaultResult() {
    return {
      semanticEmbedding: null,
      semanticEmbeddingModelName: null,
      semanticEmbeddingCreatedAt: null,
      semanticDuplicateStatus: "NOT_CHECKED",
      semanticDuplicateOfComplaintId: null,
      semanticDuplicateScore: null,
      semanticDuplicateCheckedAt: null,
    };
  }

  async checkForPossibleDuplicate({ text, locationHint }) {
    const result = this.getDefaultResult();

    if (!this.getBooleanEnv("SEMANTIC_DUPLICATE_ENABLED", true)) {
      return result;
    }

    try {
      const embeddingInput = this.buildEmbeddingText(text, locationHint);

      const embeddingResponse =
        await aiService.createSemanticEmbedding(embeddingInput);

      const semanticEmbedding = Array.isArray(embeddingResponse.embedding)
        ? embeddingResponse.embedding
        : [];

      if (semanticEmbedding.length === 0) {
        throw new Error("Embedding service returned no vector");
      }

      result.semanticEmbedding = semanticEmbedding;
      result.semanticEmbeddingModelName = embeddingResponse.modelName || null;
      result.semanticEmbeddingCreatedAt = new Date();
      result.semanticDuplicateCheckedAt = new Date();

      const lookbackHours = this.getPositiveIntegerEnv(
        "SEMANTIC_DUPLICATE_LOOKBACK_HOURS",
        72,
        24 * 30,
      );

      const maxCandidates = this.getPositiveIntegerEnv(
        "SEMANTIC_DUPLICATE_MAX_CANDIDATES",
        150,
        500,
      );

      const sinceDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

      const candidates = await complaintRepository.findRecentSemanticCandidates(
        sinceDate,
        maxCandidates,
      );

      const threshold = this.getThreshold();

      let bestMatch = null;

      for (const candidate of candidates) {
        if (
          candidate.semanticEmbeddingModelName !==
          result.semanticEmbeddingModelName
        ) {
          continue;
        }

        if (!this.hasCompatibleLocation(locationHint, candidate.locationHint)) {
          continue;
        }

        const similarityScore = this.cosineSimilarity(
          semanticEmbedding,
          candidate.semanticEmbedding,
        );

        if (
          similarityScore !== null &&
          (!bestMatch || similarityScore > bestMatch.similarityScore)
        ) {
          bestMatch = {
            complaint: candidate,
            similarityScore,
          };
        }
      }

      if (bestMatch && bestMatch.similarityScore >= threshold) {
        result.semanticDuplicateStatus = "POSSIBLE_DUPLICATE";

        result.semanticDuplicateOfComplaintId = bestMatch.complaint._id;

        result.semanticDuplicateScore = Number(
          bestMatch.similarityScore.toFixed(6),
        );

        console.log(
          `🔁 Possible semantic duplicate found: ${bestMatch.complaint.complaintId} (${result.semanticDuplicateScore})`,
        );

        return result;
      }

      result.semanticDuplicateStatus = "NO_MATCH";

      if (bestMatch) {
        result.semanticDuplicateScore = Number(
          bestMatch.similarityScore.toFixed(6),
        );
      }

      return result;
    } catch (error) {
      console.warn(
        `⚠️ Semantic duplicate detection unavailable: ${error.message}`,
      );

      return {
        ...result,
        semanticDuplicateStatus: "UNAVAILABLE",
        semanticDuplicateCheckedAt: new Date(),
      };
    }
  }
}

export default new SemanticDuplicateService();
