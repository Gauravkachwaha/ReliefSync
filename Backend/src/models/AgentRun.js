import mongoose from "mongoose";

const agentRunSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      default: null,
      index: true,
    },
    agentType: {
      type: String,
      required: true,
      index: true,
    },
    toolCalls: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    decisionSummary: {
      type: String,
      default: "",
    },
    retrievedDocumentIds: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      default: "SUCCESS",
    },
  },
  { timestamps: true }
);

const AgentRun = mongoose.model("AgentRun", agentRunSchema);

export default AgentRun;
