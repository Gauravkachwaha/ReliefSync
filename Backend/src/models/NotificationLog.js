import mongoose from "mongoose";

const notificationLogSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      default: null,
      trim: true,
      maxlength: 250,
    },

    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },

    channel: {
      type: String,
      enum: ["CONSOLE", "IN_APP", "EMAIL", "SMS", "WHATSAPP"],
      default: "CONSOLE",
      index: true,
    },

    status: {
      type: String,
      enum: ["QUEUED", "PROCESSING", "SENT", "FAILED", "CANCELLED"],
      default: "QUEUED",
      index: true,
    },

    recipientType: {
      type: String,
      enum: ["NGO", "VOLUNTEER", "SUPER_ADMIN", "GUEST", "SYSTEM"],
      required: true,
      index: true,
    },

    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NGO",
      default: null,
      index: true,
    },

    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Volunteer",
      default: null,
      index: true,
    },

    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      default: null,
      index: true,
    },

    ngoCaseOfferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NgoCaseOffer",
      default: null,
      index: true,
    },

    volunteerOfferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VolunteerOffer",
      default: null,
      index: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    deliveryAttempts: {
      type: Number,
      min: 0,
      default: 0,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    failedAt: {
      type: Date,
      default: null,
    },

    lastError: {
      type: String,
      default: null,
      maxlength: 1000,
    },

    bullMqJobId: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

notificationLogSchema.index(
  {
    idempotencyKey: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: {
        $type: "string",
      },
    },
  },
);

notificationLogSchema.index({
  status: 1,
  channel: 1,
  createdAt: -1,
});

notificationLogSchema.index({
  recipientType: 1,
  status: 1,
  createdAt: -1,
});

const NotificationLog = mongoose.model(
  "NotificationLog",
  notificationLogSchema,
);

export default NotificationLog;
