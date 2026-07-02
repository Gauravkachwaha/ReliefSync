import mongoose from "mongoose";

const progressUpdateSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      default: "assigned",
    },

    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const assignmentSchema = new mongoose.Schema(
  {
    // Old project workflow can continue using needId.
    needId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Need",
      index: true,
    },

    // New public complaint workflow uses complaintId.
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      index: true,
    },

    volunteerOfferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VolunteerOffer",
    },

    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Volunteer",
      required: true,
      index: true,
    },

    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NGO",
      required: true,
      index: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "assigned",
        "travelling",
        "in_progress",
        "completed",
        "cancelled",
      ],
      default: "assigned",
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    progressUpdates: {
      type: [progressUpdateSchema],
      default: [],
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

assignmentSchema.pre("validate", async function validateAssignment() {
  if (!this.needId && !this.complaintId) {
    this.invalidate("complaintId", "Either needId or complaintId is required");
  }
});

// One volunteer cannot receive two assignments for one complaint.
assignmentSchema.index(
  { complaintId: 1, volunteerId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      complaintId: { $exists: true },
    },
  },
);

// One accepted volunteer offer can create only one assignment.
assignmentSchema.index(
  { volunteerOfferId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      volunteerOfferId: { $exists: true },
    },
  },
);

const Assignment = mongoose.model("Assignment", assignmentSchema);

export default Assignment;
