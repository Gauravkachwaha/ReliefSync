import mongoose from "mongoose";

const escalationSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true,
    },

    reason: {
      type: String,
      enum: ["NO_ELIGIBLE_NGO", "NO_ELIGIBLE_VOLUNTEER"],
      required: true,
      index: true,
    },

    priority: {
      type: String,
      enum: ["HIGH", "URGENT"],
      default: "HIGH",
    },

    status: {
      type: String,
      enum: ["OPEN", "RESOLVED"],
      default: "OPEN",
      index: true,
    },

    // Only one active escalation for the same complaint and reason.
    isActive: {
      type: Boolean,
      default: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    context: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    notificationLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotificationLog",
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    resolvedNote: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  },
);

escalationSchema.index(
  {
    complaintId: 1,
    reason: 1,
    isActive: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isActive: true,
    },
  },
);

escalationSchema.index({
  status: 1,
  priority: -1,
  createdAt: -1,
});

const Escalation = mongoose.model("Escalation", escalationSchema);

export default Escalation;
