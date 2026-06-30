import aiService from "./aiService.js";
import spamService from "./spamService.js";

const emergencyTerms = [
  "fire",
  "flood",
  "earthquake",
  "injured",
  "bleeding",
  "accident",
  "medical emergency",
  "first aid",
  "rescue",
  "shelter",
  "evacuate",
  "food",
  "water",
  "aag",
  "baadh",
  "chot",
  "madad",
  "bachao",
];

class ComplaintSpamScreeningService {
  clampProbability(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return null;
    }

    return Math.max(0, Math.min(1, numericValue));
  }

  getBooleanEnv(name, defaultValue = false) {
    const value = process.env[name];

    if (value === undefined) {
      return defaultValue;
    }

    return String(value).trim().toLowerCase() === "true";
  }

  getThresholdEnv(name, defaultValue) {
    const value = Number(process.env[name]);

    if (!Number.isFinite(value) || value < 0 || value > 1) {
      return defaultValue;
    }

    return value;
  }

  findEmergencySignals(text) {
    const normalizedText = String(text || "").toLowerCase();

    return emergencyTerms.filter((term) => normalizedText.includes(term));
  }

  applyHybridPolicy({
    text,
    ruleSpamScore,
    ruleSpamDecision,
    mlSpamStatus,
    mlSpamProbability,
    ruleFlags,
  }) {
    const policyEnabled = this.getBooleanEnv("ML_SPAM_POLICY_ENABLED", false);

    const reviewThreshold = this.getThresholdEnv(
      "ML_SPAM_REVIEW_THRESHOLD",
      0.8,
    );

    const blockThreshold = this.getThresholdEnv(
      "ML_SPAM_BLOCK_THRESHOLD",
      0.98,
    );

    const ruleBlockThreshold = this.getThresholdEnv(
      "ML_SPAM_RULE_BLOCK_THRESHOLD",
      0.8,
    );

    const finalFlags = [...ruleFlags];

    const emergencySignals = this.findEmergencySignals(text);

    const modelWasScored =
      mlSpamStatus === "SCORED" && mlSpamProbability !== null;

    const finalSpamScore = Math.max(ruleSpamScore, mlSpamProbability || 0);

    // Until enabled, rules remain exactly as before.
    if (!policyEnabled || !modelWasScored) {
      return {
        finalSpamDecision: ruleSpamDecision,
        finalSpamScore,
        finalFlags,
      };
    }

    const modelIsSuspicious = mlSpamProbability >= reviewThreshold;

    const modelStronglyAgrees = mlSpamProbability >= blockThreshold;

    const ruleIsStrongSpam =
      ruleSpamDecision === "BLOCK" || ruleSpamScore >= ruleBlockThreshold;

    // Emergency-related text must never be automatically blocked by ML.
    if (emergencySignals.length > 0) {
      finalFlags.push("EMERGENCY_PROTECTION_ACTIVE");

      emergencySignals.forEach((signal) => {
        finalFlags.push(
          `EMERGENCY_SIGNAL_${signal.toUpperCase().replace(/\s+/g, "_")}`,
        );
      });

      if (ruleSpamDecision === "BLOCK") {
        finalFlags.push("RULE_BLOCK_DOWNGRADED_TO_REVIEW");

        return {
          finalSpamDecision: "HOLD_FOR_REVIEW",
          finalSpamScore,
          finalFlags,
        };
      }

      return {
        finalSpamDecision: ruleSpamDecision,
        finalSpamScore,
        finalFlags,
      };
    }

    // Existing rule block remains a block only when ML also strongly agrees.
    if (ruleSpamDecision === "BLOCK") {
      if (ruleIsStrongSpam && modelStronglyAgrees) {
        finalFlags.push("RULE_AND_ML_STRONG_SPAM_AGREEMENT");

        return {
          finalSpamDecision: "BLOCK",
          finalSpamScore,
          finalFlags,
        };
      }

      finalFlags.push("RULE_ML_DISAGREEMENT_REVIEW");

      return {
        finalSpamDecision: "HOLD_FOR_REVIEW",
        finalSpamScore,
        finalFlags,
      };
    }

    // Existing review decisions stay in review.
    if (ruleSpamDecision === "HOLD_FOR_REVIEW") {
      if (modelIsSuspicious) {
        finalFlags.push("RULE_AND_ML_REVIEW_AGREEMENT");
      }

      return {
        finalSpamDecision: "HOLD_FOR_REVIEW",
        finalSpamScore,
        finalFlags,
      };
    }

    // Rules allowed it, but model is suspicious:
    // route to review, never direct block.
    if (modelIsSuspicious) {
      finalFlags.push("ML_SUSPICIOUS_REVIEW");

      return {
        finalSpamDecision: "HOLD_FOR_REVIEW",
        finalSpamScore,
        finalFlags,
      };
    }

    return {
      finalSpamDecision: "ALLOW",
      finalSpamScore,
      finalFlags,
    };
  }

  async screenComplaintText(text) {
    const ruleResult = spamService.evaluateSubmission({
      text,
    });

    const result = {
      ruleSpamScore: this.clampProbability(ruleResult.score) || 0,
      ruleSpamDecision: ruleResult.decision,
      ruleFlags: Array.isArray(ruleResult.ruleFlags)
        ? ruleResult.ruleFlags
        : [],

      mlSpamStatus: "NOT_RUN",
      mlSpamProbability: null,
      mlSpamClassification: null,
      mlSpamRawLabel: null,
      mlSpamRawScore: null,
      mlSpamModelName: null,
      mlSpamScoredAt: null,
      mlSpamShadowMode: true,

      finalSpamScore: this.clampProbability(ruleResult.score) || 0,
      finalSpamDecision: ruleResult.decision,
    };

    try {
      const modelResult = await aiService.predictSpamInShadowMode(text);

      result.mlSpamStatus = "SCORED";

      result.mlSpamProbability = this.clampProbability(
        modelResult.spamProbability,
      );

      result.mlSpamClassification =
        modelResult.classification === "SPAM" ? "SPAM" : "HAM";

      result.mlSpamRawLabel = modelResult.rawLabel || null;

      result.mlSpamRawScore = this.clampProbability(modelResult.rawScore);

      result.mlSpamModelName = modelResult.modelName || null;

      result.mlSpamScoredAt = new Date();

      result.mlSpamShadowMode = !this.getBooleanEnv(
        "ML_SPAM_POLICY_ENABLED",
        false,
      );

      const hybridResult = this.applyHybridPolicy({
        text,
        ruleSpamScore: result.ruleSpamScore,
        ruleSpamDecision: result.ruleSpamDecision,
        mlSpamStatus: result.mlSpamStatus,
        mlSpamProbability: result.mlSpamProbability,
        ruleFlags: result.ruleFlags,
      });

      result.finalSpamScore = hybridResult.finalSpamScore;
      result.finalSpamDecision = hybridResult.finalSpamDecision;

      result.ruleFlags = hybridResult.finalFlags;

      console.log(
        `🧠 Hybrid spam policy → Rule: ${result.ruleSpamDecision}, ML: ${result.mlSpamClassification} (${result.mlSpamProbability}), Final: ${result.finalSpamDecision}`,
      );
    } catch (error) {
      result.mlSpamStatus = "UNAVAILABLE";

      console.warn(
        `⚠️ ML spam scoring unavailable. Rules remain active: ${error.message}`,
      );
    }

    return result;
  }
}

export default new ComplaintSpamScreeningService();
