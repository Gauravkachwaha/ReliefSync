const allowedCategories = [
  "MEDICAL_SUPPORT",
  "FOOD_RELIEF",
  "SHELTER_SUPPORT",
  "DISASTER_RELIEF",
  "WOMEN_CHILD_SAFETY",
  "CIVIC_GRIEVANCE",
  "GENERAL_SUPPORT",
];

const allowedSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const severityRank = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

class ComplaintClassificationPolicyService {
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

  normalizeCategory(value) {
    const normalizedValue = String(value || "")
      .trim()
      .toUpperCase();

    return allowedCategories.includes(normalizedValue) ? normalizedValue : null;
  }

  normalizeSeverity(value) {
    const normalizedValue = String(value || "")
      .trim()
      .toUpperCase();

    return allowedSeverities.includes(normalizedValue) ? normalizedValue : null;
  }

  clampProbability(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return null;
    }

    return Math.max(0, Math.min(1, numericValue));
  }

  resolve({ ruleCategory, ruleSeverity, classifierAudit }) {
    const policyEnabled = this.getBooleanEnv(
      "ML_CLASSIFICATION_POLICY_ENABLED",
      false,
    );

    const categoryFallbackThreshold = this.getThresholdEnv(
      "ML_CATEGORY_FALLBACK_THRESHOLD",
      0.8,
    );

    const categoryConflictThreshold = this.getThresholdEnv(
      "ML_CATEGORY_CONFLICT_REVIEW_THRESHOLD",
      0.9,
    );

    const severityPromotionThreshold = this.getThresholdEnv(
      "ML_SEVERITY_PROMOTION_THRESHOLD",
      0.75,
    );

    const normalizedRuleCategory =
      this.normalizeCategory(ruleCategory) || "GENERAL_SUPPORT";

    const normalizedRuleSeverity =
      this.normalizeSeverity(ruleSeverity) || "MEDIUM";

    const normalizedMlCategory = this.normalizeCategory(
      classifierAudit?.mlPredictedCategory,
    );

    const normalizedMlSeverity = this.normalizeSeverity(
      classifierAudit?.mlPredictedSeverity,
    );

    const mlCategoryConfidence = this.clampProbability(
      classifierAudit?.mlCategoryConfidence,
    );

    const mlSeverityConfidence = this.clampProbability(
      classifierAudit?.mlSeverityConfidence,
    );

    const modelWasScored = classifierAudit?.mlClassificationStatus === "SCORED";

    const result = {
      category: normalizedRuleCategory,
      severity: normalizedRuleSeverity,
      finalCategorySource: "RULE",
      finalSeveritySource: "RULE",

      classificationPolicyEnabled: policyEnabled,
      classificationPolicyStatus: "RULE_ONLY",
      classificationPolicyFlags: [],
      classificationReviewRequired: false,
    };

    if (!policyEnabled) {
      result.classificationPolicyFlags.push(
        "ML_CLASSIFICATION_POLICY_DISABLED",
      );

      return result;
    }

    if (!modelWasScored) {
      result.classificationPolicyStatus = "ML_UNAVAILABLE";
      result.classificationPolicyFlags.push("ML_CLASSIFIER_NOT_AVAILABLE");

      return result;
    }

    const ruleCategoryIsGeneric = normalizedRuleCategory === "GENERAL_SUPPORT";

    const mlCategoryIsSpecific =
      normalizedMlCategory && normalizedMlCategory !== "GENERAL_SUPPORT";

    let mlCategoryWasApplied = false;
    let mlSeverityWasApplied = false;

    // Rule extractor did not identify a meaningful category,
    // so a high-confidence ML category can safely be used.
    if (
      ruleCategoryIsGeneric &&
      mlCategoryIsSpecific &&
      mlCategoryConfidence !== null &&
      mlCategoryConfidence >= categoryFallbackThreshold
    ) {
      result.category = normalizedMlCategory;
      result.finalCategorySource = "ML";
      mlCategoryWasApplied = true;

      result.classificationPolicyFlags.push("ML_CATEGORY_FALLBACK_APPLIED");
    }

    // A specific rule category and a different high-confidence ML category
    // means the system needs a human decision before routing.
    if (
      !ruleCategoryIsGeneric &&
      mlCategoryIsSpecific &&
      normalizedMlCategory !== normalizedRuleCategory &&
      mlCategoryConfidence !== null &&
      mlCategoryConfidence >= categoryConflictThreshold
    ) {
      result.classificationReviewRequired = true;
      result.classificationPolicyStatus = "CONFLICT_REVIEW_REQUIRED";

      result.classificationPolicyFlags.push(
        "HIGH_CONFIDENCE_CATEGORY_CONFLICT",
        `RULE_CATEGORY_${normalizedRuleCategory}`,
        `ML_CATEGORY_${normalizedMlCategory}`,
      );
    }

    // ML may increase urgency, but it must never lower urgency.
    if (
      normalizedMlSeverity &&
      mlSeverityConfidence !== null &&
      mlSeverityConfidence >= severityPromotionThreshold &&
      severityRank[normalizedMlSeverity] > severityRank[normalizedRuleSeverity]
    ) {
      result.severity = normalizedMlSeverity;
      result.finalSeveritySource = "ML";
      mlSeverityWasApplied = true;

      result.classificationPolicyFlags.push("ML_SEVERITY_PROMOTED");
    }

    if (!result.classificationReviewRequired) {
      if (mlCategoryWasApplied && mlSeverityWasApplied) {
        result.classificationPolicyStatus = "ML_HYBRID_APPLIED";
      } else if (mlCategoryWasApplied) {
        result.classificationPolicyStatus = "ML_CATEGORY_FALLBACK";
      } else if (mlSeverityWasApplied) {
        result.classificationPolicyStatus = "ML_SEVERITY_PROMOTED";
      }
    }

    return result;
  }
}

export default new ComplaintClassificationPolicyService();
