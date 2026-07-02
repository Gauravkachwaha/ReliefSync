import crypto from "crypto";
import complaintClassificationPolicyService from "./complaintClassificationPolicyService.js";
import complaintRepository from "../repositories/complaintRepository.js";
import spamService from "./spamService.js";
import complaintSpamScreeningService from "./complaintSpamScreeningService.js";
import semanticDuplicateService from "./semanticDuplicateService.js";
import aiService from "./aiService.js";
import ngoRedispatchService from "./ngoRedispatchService.js";
import agentLogService from "./agentLogService.js";
import Complaint from "../models/Complaint.js";

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

  // --- Duplicate Detection Helpers ---

  normalizeForSimilarity(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  getTokenSet(text) {
    return new Set(
      this.normalizeForSimilarity(text)
        .split(" ")
        .filter((t) => t.length >= 3)
    );
  }

  getJaccardSimilarity(textA, textB) {
    const setA = this.getTokenSet(textA);
    const setB = this.getTokenSet(textB);
    if (setA.size === 0 && setB.size === 0) return 1;
    if (setA.size === 0 || setB.size === 0) return 0;
    const intersection = [...setA].filter((t) => setB.has(t)).length;
    const union = new Set([...setA, ...setB]).size;
    return intersection / union;
  }

  async findTextSimilarRecentComplaint(text, locationHint, withinMinutes = 60) {
    const since = new Date(Date.now() - withinMinutes * 60 * 1000);
    // Only check active/routed complaints — spam/blocked ones don't count
    const recentComplaints = await Complaint.find({
      createdAt: { $gte: since },
      status: {
        $nin: ["BLOCKED", "DUPLICATE"],
      },
    })
      .select("_id complaintId originalText locationHint status")
      .limit(200)
      .lean();

    const JACCARD_THRESHOLD = 0.72;

    for (const c of recentComplaints) {
      const similarity = this.getJaccardSimilarity(text, c.originalText);
      if (similarity >= JACCARD_THRESHOLD) {
        console.log(
          `🔁 Text-similarity duplicate found: ${c.complaintId} (Jaccard=${similarity.toFixed(3)})`
        );
        return c;
      }
    }
    return null;
  }

  // -----------------------------------

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
      return "Your complaint was received but a very similar report may already be active. It has been flagged for human review before routing.";
    }

    if (status === "DUPLICATE") {
      return "An identical complaint has already been submitted recently. Use your tracking link to follow the original report's progress.";
    }

    if (status === "PROCESSING") {
      return "Your complaint is safely recorded and is being processed.";
    }

    if (status === "NEEDS_CLARIFICATION") {
      return "Your complaint was understood, but more details are needed before NGO routing.";
    }

    if (status === "READY_FOR_ROUTING") {
      return "Your complaint has been recorded and is being dispatched to verified NGOs in the network.";
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

      // Log Complaint Intake Agent run
      await agentLogService.logRun({
        complaintId: updatedComplaint._id,
        agentType: "Complaint Intake Agent",
        toolCalls: [
          {
            toolName: "extractComplaintData",
            args: { text: updatedComplaint.originalText, locationHint: updatedComplaint.locationHint },
            result: {
              category: updatedComplaint.category,
              severity: updatedComplaint.severity,
              requiredPeople,
              requiredSkills
            }
          }
        ],
        decisionSummary: `Extracted complaint category "${updatedComplaint.category}" and severity "${updatedComplaint.severity}". Status set to "${nextStatus}".`,
        status: "SUCCESS"
      });

      // If clarification is needed, log Clarification Agent run
      if (nextStatus === "NEEDS_CLARIFICATION") {
        await agentLogService.logRun({
          complaintId: updatedComplaint._id,
          agentType: "Clarification Agent",
          toolCalls: [
            {
              toolName: "requestMissingDetails",
              args: {
                text: updatedComplaint.originalText,
                locationHint: updatedComplaint.locationHint,
                needsClarification: true
              },
              result: {
                questions: updatedComplaint.aiExtractedData?.clarificationQuestions || [
                  "Please provide more specific details."
                ]
              }
            }
          ],
          decisionSummary: `Clarification questions generated: ${JSON.stringify(updatedComplaint.aiExtractedData?.clarificationQuestions)}`,
          status: "SUCCESS"
        });
      }

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
            routingError.stack,
          );
        }
      }

      return updatedComplaint;
    } catch (error) {
      const classifierAudit = await classifierAuditPromise;

      console.error(
        `❌ AI extraction failed for complaint ${complaint.complaintId}:`,
        error.message,
      );

      // FALLBACK: Even when AI is unavailable, route complaint to all NGOs
      // with a default GENERAL_SUPPORT category so it never gets stuck at PROCESSING.
      const fallbackCategory = "GENERAL_SUPPORT";
      const fallbackSeverity = "MEDIUM";

      let fallbackComplaint = await complaintRepository.updateById(complaint._id, {
        ...classifierAudit,
        category: fallbackCategory,
        severity: fallbackSeverity,
        finalCategorySource: "RULE",
        finalSeveritySource: "RULE",
        classificationPolicyEnabled: false,
        classificationPolicyStatus: "ML_UNAVAILABLE",
        classificationPolicyFlags: ["AI_EXTRACTION_FAILED", "FALLBACK_CATEGORY_ASSIGNED"],
        classificationReviewRequired: false,
        requiredPeople: 1,
        requiredSkills: [],
        status: "READY_FOR_ROUTING",
      });

      // Still attempt NGO routing with the fallback category
      try {
        const routingResult = await ngoRedispatchService.dispatchNextNgoWave({
          complaintId: fallbackComplaint._id,
          trigger: "INITIAL_ROUTING",
        });

        if (routingResult.complaint) {
          fallbackComplaint = routingResult.complaint;
        }
      } catch (routingError) {
        console.error(
          `❌ Fallback NGO routing also failed for complaint ${complaint.complaintId}:`,
          routingError.message,
          routingError.stack,
        );
      }

      return fallbackComplaint;
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

      // Semantic duplicate check: AI hit
      if (
        screeningResult.finalSpamDecision === "ALLOW" &&
        semanticResult.semanticDuplicateStatus === "POSSIBLE_DUPLICATE"
      ) {
        complaintStatus = "REVIEW_REQUIRED";
      }

      // Fallback: when AI embedding service is unavailable, run Jaccard token-overlap check
      // This catches near-identical resubmissions even without the ML service running.
      if (
        screeningResult.finalSpamDecision === "ALLOW" &&
        semanticResult.semanticDuplicateStatus === "UNAVAILABLE"
      ) {
        try {
          const textSimilarMatch = await this.findTextSimilarRecentComplaint(
            cleanText,
            cleanLocationHint,
            60, // look back 60 minutes
          );

          if (textSimilarMatch) {
            complaintStatus = "REVIEW_REQUIRED";
            // Inject a pseudo-semantic result so the DB record reflects what happened
            semanticResult = {
              ...semanticResult,
              semanticDuplicateStatus: "POSSIBLE_DUPLICATE",
              semanticDuplicateOfComplaintId: textSimilarMatch._id,
              semanticDuplicateScore: null,
              semanticDuplicateCheckedAt: new Date(),
            };
          }
        } catch (jaccardError) {
          console.warn(`⚠️ Jaccard fallback check failed: ${jaccardError.message}`);
        }
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
      complaintStatus !== "REVIEW_REQUIRED" &&
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
      feedback: complaint.feedback || null,
    };
  }
}

export default new ComplaintService();
