import crypto from "crypto";
import complaintClassificationPolicyService from "./complaintClassificationPolicyService.js";
import complaintRepository from "../repositories/complaintRepository.js";
import spamService from "./spamService.js";
import complaintSpamScreeningService from "./complaintSpamScreeningService.js";
import semanticDuplicateService from "./semanticDuplicateService.js";
import aiService from "./aiService.js";
import ngoRedispatchService from "./ngoRedispatchService.js";

class ComplaintService {
  hashTrackingToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  clampProbability(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return null;
    }

    return Math.max(0, Math.min(1, numericValue));
  }

  getRankedScores(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.slice(0, 10).map((item) => ({
      label: String(item?.label || ""),
      description: String(item?.description || ""),
      score: this.clampProbability(item?.score),
    }));
  }

  getEmptyClassifierAudit(status = "NOT_RUN") {
    return {
      mlClassificationStatus: status,
      mlClassifierModelName: null,
      mlPredictedCategory: null,
      mlCategoryConfidence: null,
      mlCategoryRankedScores: [],
      mlPredictedSeverity: null,
      mlSeverityConfidence: null,
      mlSeverityRankedScores: [],
      mlClassifierScoredAt: null,
      mlClassifierShadowMode: true,
    };
  }

  async getClassifierAudit(text) {
    try {
      const result = await aiService.classifyComplaintInShadowMode(text);

      const category = result?.category || {};
      const severity = result?.severity || {};

      const audit = {
        mlClassificationStatus: "SCORED",
        mlClassifierModelName: result?.modelName || null,
        mlPredictedCategory: category?.label || null,
        mlCategoryConfidence: this.clampProbability(category?.confidence),
        mlCategoryRankedScores: this.getRankedScores(category?.rankedScores),
        mlPredictedSeverity: severity?.label || null,
        mlSeverityConfidence: this.clampProbability(severity?.confidence),
        mlSeverityRankedScores: this.getRankedScores(severity?.rankedScores),
        mlClassifierScoredAt: new Date(),
        mlClassifierShadowMode: result?.shadowMode !== false,
      };

      console.log(
        `🧠 Classifier shadow result → Category: ${audit.mlPredictedCategory} (${audit.mlCategoryConfidence}), Severity: ${audit.mlPredictedSeverity} (${audit.mlSeverityConfidence})`,
      );

      return audit;
    } catch (error) {
      console.warn(
        `⚠️ Complaint classifier unavailable. Rule extraction continues: ${error.message}`,
      );

      return this.getEmptyClassifierAudit("UNAVAILABLE");
    }
  }

  async generateUniqueComplaintId() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const complaintId = `RS-${crypto
        .randomBytes(6)
        .toString("hex")
        .toUpperCase()}`;

      const existingComplaint =
        await complaintRepository.findByComplaintId(complaintId);

      if (!existingComplaint) {
        return complaintId;
      }
    }

    throw new Error("Could not generate a unique complaint ID");
  }

  getStatusFromSpamDecision(decision) {
    if (decision === "BLOCK") {
      return "BLOCKED";
    }

    if (decision === "HOLD_FOR_REVIEW") {
      return "REVIEW_REQUIRED";
    }

    return "SUBMITTED";
  }

  getDuplicateScreeningResult() {
    return {
      ruleSpamScore: 0.5,
      ruleSpamDecision: "HOLD_FOR_REVIEW",
      ruleFlags: ["DUPLICATE_CONTENT"],

      mlSpamStatus: "NOT_RUN",
      mlSpamProbability: null,
      mlSpamClassification: null,
      mlSpamRawLabel: null,
      mlSpamRawScore: null,
      mlSpamModelName: null,
      mlSpamScoredAt: null,
      mlSpamShadowMode: true,

      finalSpamScore: 0.5,
      finalSpamDecision: "HOLD_FOR_REVIEW",
    };
  }

  getExactDuplicateSemanticResult(duplicateComplaint) {
    return {
      semanticEmbedding: null,
      semanticEmbeddingModelName: null,
      semanticEmbeddingCreatedAt: null,
      semanticDuplicateStatus: "EXACT_DUPLICATE",
      semanticDuplicateOfComplaintId: duplicateComplaint._id,
      semanticDuplicateScore: 1,
      semanticDuplicateCheckedAt: new Date(),
    };
  }

  getPublicMessage(status) {
    if (status === "BLOCKED") {
      return "Your complaint was received but cannot be processed automatically.";
    }

    if (status === "REVIEW_REQUIRED") {
      return "Your complaint was received and needs verification before further processing.";
    }

    if (status === "DUPLICATE") {
      return "A similar complaint was already submitted recently and was marked for review.";
    }

    if (status === "PROCESSING") {
      return "Your complaint is safely recorded and is being processed.";
    }

    if (status === "NEEDS_CLARIFICATION") {
      return "Your complaint was understood, but more details are needed before NGO routing.";
    }

    if (status === "READY_FOR_ROUTING") {
      return "Your complaint is ready for NGO routing, but no suitable verified NGO was found yet.";
    }

    if (status === "NGOS_NOTIFIED") {
      return "Your complaint was sent to suitable verified NGOs for review.";
    }

    if (status === "NGO_ACCEPTED") {
      return "An NGO has accepted your complaint and is arranging support.";
    }

    if (
      status === "VOLUNTEER_MATCHING" ||
      status === "PARTIALLY_ASSIGNED" ||
      status === "FULLY_ASSIGNED"
    ) {
      return "The NGO is matching volunteers for your complaint.";
    }

    if (status === "IN_PROGRESS") {
      return "Support is currently in progress.";
    }

    if (status === "RESOLVED") {
      return "Support for this complaint has been marked as completed.";
    }

    return "Complaint submitted successfully. Save your private tracking link.";
  }

  async processAllowedComplaint(complaint) {
    await complaintRepository.updateById(complaint._id, {
      status: "PROCESSING",
    });

    const classifierAuditPromise = this.getClassifierAudit(
      complaint.originalText,
    );

    try {
      const extractedData = await aiService.extractStructuredData(
        complaint.originalText,
        complaint.locationHint,
      );

      const classifierAudit = await classifierAuditPromise;

      const classificationDecision =
        complaintClassificationPolicyService.resolve({
          ruleCategory: extractedData.category,
          ruleSeverity: extractedData.severity,
          classifierAudit,
        });

      const requiredPeople = Math.max(
        1,
        Number.parseInt(extractedData.affectedPeople, 10) || 1,
      );

      const requiredSkills = Array.isArray(extractedData.requiredSkills)
        ? extractedData.requiredSkills
        : [];

      const extractionStatus = extractedData.needsClarification
        ? "NEEDS_CLARIFICATION"
        : "READY_FOR_ROUTING";

      // A strong ML-vs-rule category conflict needs review.
      // It must not silently route the complaint to a potentially wrong NGO.
      const nextStatus =
        classificationDecision.classificationReviewRequired &&
        extractionStatus === "READY_FOR_ROUTING"
          ? "REVIEW_REQUIRED"
          : extractionStatus;

      let updatedComplaint = await complaintRepository.updateById(
        complaint._id,
        {
          aiExtractedData: extractedData,

          category: classificationDecision.category,
          severity: classificationDecision.severity,

          finalCategorySource: classificationDecision.finalCategorySource,

          finalSeveritySource: classificationDecision.finalSeveritySource,

          ...classifierAudit,

          // The model is no longer purely shadow-only when policy is active.
          mlClassifierShadowMode:
            !classificationDecision.classificationPolicyEnabled,

          classificationPolicyEnabled:
            classificationDecision.classificationPolicyEnabled,

          classificationPolicyStatus:
            classificationDecision.classificationPolicyStatus,

          classificationPolicyFlags:
            classificationDecision.classificationPolicyFlags,

          classificationReviewRequired:
            classificationDecision.classificationReviewRequired,

          requiredPeople,
          requiredSkills,
          status: nextStatus,
        },
      );

      if (nextStatus === "READY_FOR_ROUTING") {
        try {
          const routingResult = await ngoRedispatchService.dispatchNextNgoWave({
            complaintId: updatedComplaint._id,
            trigger: "INITIAL_ROUTING",
          });

          if (routingResult.complaint) {
            updatedComplaint = routingResult.complaint;
          }
        } catch (routingError) {
          console.error(
            `❌ NGO routing failed for complaint ${complaint.complaintId}:`,
            routingError.message,
          );
        }
      }

      return updatedComplaint;
    } catch (error) {
      const classifierAudit = await classifierAuditPromise;

      console.error(
        `❌ FastAPI extraction failed for complaint ${complaint.complaintId}:`,
        error.message,
      );

      return await complaintRepository.updateById(complaint._id, {
        ...classifierAudit,
        classificationPolicyEnabled:
          complaintClassificationPolicyService.getBooleanEnv(
            "ML_CLASSIFICATION_POLICY_ENABLED",
            false,
          ),
        classificationPolicyStatus: "ML_UNAVAILABLE",
        classificationPolicyFlags: ["RULE_EXTRACTION_FAILED"],
        classificationReviewRequired: false,
        status: "PROCESSING",
      });
    }
  }

  async createGuestComplaint({ text, locationHint, sourceType }) {
    const cleanText = text.trim();
    const cleanLocationHint = locationHint?.trim() || null;

    const contentFingerprint = spamService.createContentFingerprint(
      cleanText,
      cleanLocationHint,
    );

    const duplicateSince = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const duplicateComplaint =
      await complaintRepository.findRecentByContentFingerprint(
        contentFingerprint,
        duplicateSince,
      );

    let screeningResult;
    let semanticResult;
    let complaintStatus;
    let duplicateOfComplaintId = null;

    if (duplicateComplaint) {
      screeningResult = this.getDuplicateScreeningResult();

      semanticResult = this.getExactDuplicateSemanticResult(duplicateComplaint);

      complaintStatus = "DUPLICATE";
      duplicateOfComplaintId = duplicateComplaint._id;
    } else {
      const [spamResult, duplicateResult] = await Promise.all([
        complaintSpamScreeningService.screenComplaintText(cleanText),
        semanticDuplicateService.checkForPossibleDuplicate({
          text: cleanText,
          locationHint: cleanLocationHint,
        }),
      ]);

      screeningResult = spamResult;
      semanticResult = duplicateResult;

      complaintStatus = this.getStatusFromSpamDecision(
        screeningResult.finalSpamDecision,
      );

      if (
        screeningResult.finalSpamDecision === "ALLOW" &&
        semanticResult.semanticDuplicateStatus === "POSSIBLE_DUPLICATE"
      ) {
        complaintStatus = "REVIEW_REQUIRED";
      }
    }

    const complaintId = await this.generateUniqueComplaintId();

    const trackingToken = crypto.randomBytes(32).toString("hex");

    let complaint = await complaintRepository.create({
      complaintId,
      guestTrackingTokenHash: this.hashTrackingToken(trackingToken),
      originalText: cleanText,
      locationHint: cleanLocationHint,
      sourceType,
      contentFingerprint,

      spamScore: screeningResult.finalSpamScore,
      spamDecision: screeningResult.finalSpamDecision,
      spamRuleFlags: screeningResult.ruleFlags,

      ruleSpamScore: screeningResult.ruleSpamScore,
      ruleSpamDecision: screeningResult.ruleSpamDecision,

      mlSpamStatus: screeningResult.mlSpamStatus,
      mlSpamProbability: screeningResult.mlSpamProbability,
      mlSpamClassification: screeningResult.mlSpamClassification,
      mlSpamRawLabel: screeningResult.mlSpamRawLabel,
      mlSpamRawScore: screeningResult.mlSpamRawScore,
      mlSpamModelName: screeningResult.mlSpamModelName,
      mlSpamScoredAt: screeningResult.mlSpamScoredAt,
      mlSpamShadowMode: screeningResult.mlSpamShadowMode,

      finalSpamDecision: screeningResult.finalSpamDecision,

      semanticEmbedding: semanticResult.semanticEmbedding,
      semanticEmbeddingModelName: semanticResult.semanticEmbeddingModelName,
      semanticEmbeddingCreatedAt: semanticResult.semanticEmbeddingCreatedAt,
      semanticDuplicateStatus: semanticResult.semanticDuplicateStatus,
      semanticDuplicateOfComplaintId:
        semanticResult.semanticDuplicateOfComplaintId,
      semanticDuplicateScore: semanticResult.semanticDuplicateScore,
      semanticDuplicateCheckedAt: semanticResult.semanticDuplicateCheckedAt,

      duplicateOfComplaintId,
      status: complaintStatus,
    });

    const canContinueAutomatically =
      !duplicateComplaint &&
      screeningResult.finalSpamDecision === "ALLOW" &&
      semanticResult.semanticDuplicateStatus !== "POSSIBLE_DUPLICATE";

    if (canContinueAutomatically) {
      complaint = await this.processAllowedComplaint(complaint);
    }

    const trackingBaseUrl = (
      process.env.PUBLIC_TRACKING_BASE_URL || "http://localhost:5173"
    ).replace(/\/+$/, "");

    const trackingUrl =
      `${trackingBaseUrl}/track/${complaint.complaintId}` +
      `?token=${encodeURIComponent(trackingToken)}`;

    return {
      complaintId: complaint.complaintId,
      trackingToken,
      trackingUrl,
      status: complaint.status,
      spamDecision: complaint.finalSpamDecision,
      message: this.getPublicMessage(complaint.status),
      createdAt: complaint.createdAt,
    };
  }

  async getTrackedComplaint(complaintId, trackingToken) {
    const complaint =
      await complaintRepository.findByComplaintIdWithTrackingHash(complaintId);

    const invalidTrackingAccess = () => {
      const error = new Error(
        "Complaint not found or tracking token is invalid",
      );

      error.status = 404;

      return error;
    };

    if (!complaint || !complaint.guestTrackingTokenHash) {
      throw invalidTrackingAccess();
    }

    const submittedTokenHash = this.hashTrackingToken(trackingToken);

    const storedHashBuffer = Buffer.from(
      complaint.guestTrackingTokenHash,
      "hex",
    );

    const submittedHashBuffer = Buffer.from(submittedTokenHash, "hex");

    if (
      storedHashBuffer.length !== submittedHashBuffer.length ||
      !crypto.timingSafeEqual(storedHashBuffer, submittedHashBuffer)
    ) {
      throw invalidTrackingAccess();
    }

    return {
      complaintId: complaint.complaintId,
      sourceType: complaint.sourceType,
      locationHint: complaint.locationHint,
      status: complaint.status,
      spamDecision: complaint.finalSpamDecision || complaint.spamDecision,
      summary: complaint.aiExtractedData?.summary || null,
      needsClarification: Boolean(
        complaint.aiExtractedData?.needsClarification,
      ),
      clarificationQuestions:
        complaint.aiExtractedData?.clarificationQuestions || [],
      category: complaint.category,
      severity: complaint.severity,
      requiredPeople: complaint.requiredPeople,
      requiredSkills: complaint.requiredSkills,
      assignedPeopleCount: complaint.assignedPeopleCount,
      createdAt: complaint.createdAt,
      updatedAt: complaint.updatedAt,
    };
  }
}

export default new ComplaintService();
