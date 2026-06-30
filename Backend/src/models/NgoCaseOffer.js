import mongoose from "mongoose";

const ngoCaseOfferSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
    },

    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NGO",
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },

    // Each redispatch creates a higher wave.
    // Example: first 3 NGOs = wave 1, next set = wave 2.
    dispatchWave: {
      type: Number,
      min: 1,
      default: 1,
    },

    // Deadline for NGO response.
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    expiredAt: {
      type: Date,
      default: null,
    },

    respondedAt: {
      type: Date,
      default: null,
    },

    responseNote: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },

    // NGO admin who accepted/rejected the offer.
    respondedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancellationReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

// One NGO must receive a specific complaint only once.
// This prevents redispatch from offering the same case to the same NGO again.
ngoCaseOfferSchema.index(
  {
    complaintId: 1,
    ngoId: 1,
  },
  {
    unique: true,
  },
);

// Used when finding pending offers that have crossed their deadline.
ngoCaseOfferSchema.index({
  status: 1,
  expiresAt: 1,
});

// Used when loading all offers for one complaint in wave order.
ngoCaseOfferSchema.index({
  complaintId: 1,
  dispatchWave: 1,
  createdAt: 1,
});

const NgoCaseOffer = mongoose.model("NgoCaseOffer", ngoCaseOfferSchema);

export default NgoCaseOffer;
