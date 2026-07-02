import AgentRun from "../models/AgentRun.js";

class AgentLogService {
  async logRun({
    complaintId,
    agentType,
    toolCalls = [],
    decisionSummary = "",
    retrievedDocumentIds = [],
    status = "SUCCESS",
  }) {
    try {
      const run = await AgentRun.create({
        complaintId,
        agentType,
        toolCalls,
        decisionSummary,
        retrievedDocumentIds,
        status,
      });
      return run;
    } catch (err) {
      console.error(
        `❌ Logging AgentRun failed for type ${agentType}:`,
        err.message
      );
      return null;
    }
  }

  async getRecentLogs(limit = 50) {
    try {
      return await AgentRun.find()
        .populate("complaintId", "complaintId originalText status")
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (err) {
      console.error("❌ Fetching AgentRun logs failed:", err.message);
      return [];
    }
  }
}

export default new AgentLogService();
