import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    guestTrackingTokenHash: {
      type: String,
      required: true,
      select: false,
    },

    sourceType: {
      type: String,
      enum: ["TEXT", "AUDIO", "PDF", "IMAGE", "DOCUMENT"],
      default: "TEXT",
    },

    originalText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    locationHint: {
      type: String,
      default: null,
      trim: true,
      maxlength: 300,
    },

    attachments: {
      type: [String],
      default: [],
    },

    contentFingerprint: {
      type: String,
      required: true,
      index: true,
    },

    semanticEmbedding: {
      type: [Number],
      default: undefined,
      select: false,
    },

    semanticEmbeddingModelName: {
      type: String,
      default: null,
    },

    semanticEmbeddingCreatedAt: {
      type: Date,
      default: null,
    },

    semanticDuplicateStatus: {
      type: String,
      enum: [
        "NOT_CHECKED",
        "NO_MATCH",
        "POSSIBLE_DUPLICATE",
        "EXACT_DUPLICATE",
        "UNAVAILABLE",
      ],
      default: "NOT_CHECKED",
      index: true,
    },

    semanticDuplicateOfComplaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      default: null,
    },

    semanticDuplicateScore: {
      type: Number,
      min: -1,
      max: 1,
      default: null,
    },

    semanticDuplicateCheckedAt: {
      type: Date,
      default: null,
    },

    contactName: {
      type: String,
      default: null,
      trim: true,
    },

    contactPhone: {
      type: String,
      default: null,
      trim: true,
    },

    contactEmail: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },

    otpVerified: {
      type: Boolean,
      default: false,
    },

    spamScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },

    spamDecision: {
      type: String,
      enum: ["PENDING", "ALLOW", "HOLD_FOR_REVIEW", "BLOCK"],
      default: "PENDING",
      index: true,
    },

    spamRuleFlags: {
      type: [String],
      default: [],
    },

    ruleSpamScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },

    ruleSpamDecision: {
      type: String,
      enum: ["PENDING", "ALLOW", "HOLD_FOR_REVIEW", "BLOCK"],
      default: "PENDING",
    },

    mlSpamStatus: {
      type: String,
      enum: ["NOT_RUN", "SCORED", "UNAVAILABLE"],
      default: "NOT_RUN",
    },

    mlSpamProbability: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },

    mlSpamClassification: {
      type: String,
      enum: ["SPAM", "HAM"],
      default: null,
    },

    mlSpamRawLabel: {
      type: String,
      default: null,
    },

    mlSpamRawScore: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },

    mlSpamModelName: {
      type: String,
      default: null,
    },

    mlSpamScoredAt: {
      type: Date,
      default: null,
    },

    mlSpamShadowMode: {
      type: Boolean,
      default: true,
    },

    finalSpamDecision: {
      type: String,
      enum: ["PENDING", "ALLOW", "HOLD_FOR_REVIEW", "BLOCK"],
      default: "PENDING",
      index: true,
    },

    duplicateOfComplaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      default: null,
    },

    aiExtractedData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Current routing values.
    // These still come from rule-based FastAPI extraction.
    category: {
      type: String,
      default: null,
      index: true,
    },

    severity: {
      type: String,
      default: null,
      index: true,
    },

    finalCategorySource: {
      type: String,
      enum: ["RULE", "ML", "MANUAL"],
      default: "RULE",
    },

    finalSeveritySource: {
      type: String,
      enum: ["RULE", "ML", "MANUAL"],
      default: "RULE",
    },

    // Shadow-mode multilingual classifier audit fields.
    mlClassificationStatus: {
      type: String,
      enum: ["NOT_RUN", "SCORED", "UNAVAILABLE"],
      default: "NOT_RUN",
    },

    mlClassifierModelName: {
      type: String,
      default: null,
    },

    mlPredictedCategory: {
      type: String,
      default: null,
    },

    mlCategoryConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },

    mlCategoryRankedScores: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    mlPredictedSeverity: {
      type: String,
      default: null,
    },

    mlSeverityConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },

    mlSeverityRankedScores: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    mlClassifierScoredAt: {
      type: Date,
      default: null,
    },

    mlClassifierShadowMode: {
      type: Boolean,
      default: true,
    },

    classificationPolicyEnabled: {
      type: Boolean,
      default: false,
    },

    classificationPolicyStatus: {
      type: String,
      enum: [
        "RULE_ONLY",
        "ML_CATEGORY_FALLBACK",
        "ML_SEVERITY_PROMOTED",
        "ML_HYBRID_APPLIED",
        "CONFLICT_REVIEW_REQUIRED",
        "ML_UNAVAILABLE",
      ],
      default: "RULE_ONLY",
      index: true,
    },

    classificationPolicyFlags: {
      type: [String],
      default: [],
    },

    classificationReviewRequired: {
      type: Boolean,
      default: false,
      index: true,
    },

    requiredPeople: {
      type: Number,
      min: 1,
      default: 1,
    },

    requiredSkills: {
      type: [String],
      default: [],
    },

    candidateNgoIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "NGO",
        },
      ],
      default: [],
    },
    ngoDispatchLockUntil: {
      type: Date,
      default: null,
      select: false,
    },

    ngoRedispatchCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    lastNgoRedispatchAt: {
      type: Date,
      default: null,
    },

    acceptedNgoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NGO",
      default: null,
      index: true,
    },

    assignedPeopleCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    status: {
      type: String,
      enum: [
        "SUBMITTED",
        "BLOCKED",
        "REVIEW_REQUIRED",
        "PROCESSING",
        "NEEDS_CLARIFICATION",
        "READY_FOR_ROUTING",
        "NGOS_NOTIFIED",
        "NGO_ACCEPTED",
        "VOLUNTEER_MATCHING",
        "PARTIALLY_ASSIGNED",
        "FULLY_ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
        "DUPLICATE",
        "REJECTED_AS_SPAM",
        "CANCELLED",
      ],
      default: "SUBMITTED",
      index: true,
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      comments: {
        type: String,
        maxlength: 1000,
        default: null,
      },
      submittedAt: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true },
);

complaintSchema.index({
  contentFingerprint: 1,
  createdAt: -1,
});

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;
