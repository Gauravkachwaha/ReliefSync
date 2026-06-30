import mongoose from "mongoose";

const ngoSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    phone: String,
    address: String,
    website: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Only a Super Admin will change this to VERIFIED later.
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    // Example: DISASTER_RELIEF, FOOD_RELIEF, MEDICAL_SUPPORT
    supportedCategories: {
      type: [String],
      default: [],
    },

    // Example: Lucknow, Gomti Nagar, Aliganj
    serviceAreas: {
      type: [String],
      default: [],
    },

    capacityConfig: {
      maxConcurrentCases: {
        type: Number,
        min: 1,
        max: 500,
        default: 10,
      },

      autoDispatchEnabled: {
        type: Boolean,
        default: false,
      },
    },

    // Expected first response time for an incoming case.
    responseSlaMinutes: {
      type: Number,
      min: 5,
      max: 1440,
      default: 60,
    },

    // These will be used later for the public NGO Impact Board.
    impactScore: {
      type: Number,
      default: 0,
    },

    impactBadges: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

const NGO = mongoose.model("NGO", ngoSchema);

export default NGO;
