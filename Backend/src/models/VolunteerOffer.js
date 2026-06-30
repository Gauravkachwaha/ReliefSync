import mongoose from "mongoose";

const volunteerOfferSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true,
    },

    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NGO",
      required: true,
      index: true,
    },

    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Volunteer",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },

    matchScore: {
      type: Number,
      default: 0,
    },

    matchReasons: {
      type: [String],
      default: [],
    },

    notifiedAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// One volunteer should receive only one offer for one complaint.
volunteerOfferSchema.index(
  { complaintId: 1, volunteerId: 1 },
  { unique: true },
);

volunteerOfferSchema.index({
  volunteerId: 1,
  status: 1,
  expiresAt: 1,
});

const VolunteerOffer = mongoose.model("VolunteerOffer", volunteerOfferSchema);

export default VolunteerOffer;
