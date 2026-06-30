import mongoose from "mongoose";

const volunteerSchema = new mongoose.Schema(
  {
    // This will be linked to a login account in the next step.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      unique: true,
      sparse: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: null,
    },

    skills: {
      type: [String],
      default: [],
    },

    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    // These are used later by the volunteer-matching engine.
    preferredAreas: {
      type: [String],
      default: [],
    },

    // Keep the old field name so your existing assignment code still works.
    availability: {
      type: String,
      enum: ["available", "busy", "on_assignment", "offline"],
      default: "available",
      index: true,
    },

    maxActiveAssignments: {
      type: Number,
      min: 1,
      max: 20,
      default: 3,
    },

    currentActiveAssignments: {
      type: Number,
      min: 0,
      default: 0,
    },

    reliabilityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },

    // For this MVP, the NGO admin verifies a volunteer before adding them.
    verificationStatus: {
      type: String,
      enum: ["VERIFIED", "SUSPENDED"],
      default: "VERIFIED",
      index: true,
    },

    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NGO",
      required: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

volunteerSchema.index({
  ngoId: 1,
  availability: 1,
  verificationStatus: 1,
});

const Volunteer = mongoose.model("Volunteer", volunteerSchema);

export default Volunteer;
