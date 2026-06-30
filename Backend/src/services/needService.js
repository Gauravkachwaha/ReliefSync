import needRepository from "../repositories/needRepository.js";
import ngoRepository from "../repositories/ngoRepository.js";
import aiService from "./aiService.js";
import crypto from "crypto";
import emailService from "./emailService.js";

// I am storing calculated priorities so identical reports do not call FastAPI again.
const priorityCache = new Map();

class NeedService {
  async calculatePriority(report) {
    const cacheKey = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          title: report.title || "",
          rawText: report.rawText || "",
          extractedData: report.aiExtractedData || {},
        }),
      )
      .digest("hex");

    if (priorityCache.has(cacheKey)) {
      console.log(`✅ Priority cache hit for report ${report._id}`);
      return priorityCache.get(cacheKey);
    }

    try {
      const priorityResult = await aiService.calculatePriority(
        report.title,
        report.rawText,
        report.aiExtractedData || {},
      );

      const priority = priorityResult.priority;

      priorityCache.set(cacheKey, priority);

      console.log(
        `✅ FastAPI priority calculated for report ${report._id}: ${priority}`,
      );

      return priority;
    } catch (err) {
      console.error(
        "❌ FastAPI priority failed, using extraction-based fallback:",
        err.message,
      );

      const severity = String(
        report.aiExtractedData?.severity ||
          report.aiExtractedData?.urgencyHint ||
          "",
      ).toLowerCase();

      let priority = "medium";

      if (severity === "critical" || severity === "very high") {
        priority = "critical";
      } else if (severity === "high") {
        priority = "high";
      } else if (severity === "low") {
        priority = "low";
      }

      priorityCache.set(cacheKey, priority);

      return priority;
    }
  }

  async createNeedFromReport(report) {
    const priority = await this.calculatePriority(report);

    const needData = {
      reportId: report._id,
      title: report.title,
      ngoId: report.ngoId,
      extractedData: report.aiExtractedData,
      priority,
      status: "pending",
    };

    const need = await needRepository.create(needData);

    // I am sending the urgent alert only when the need is critical.
    if (priority === "critical") {
      try {
        const ngo = await ngoRepository.findById(report.ngoId);

        if (ngo && ngo.email) {
          await emailService.sendCriticalNeedAlert(need, ngo.email);

          console.log(`🚨 Critical need alert sent to NGO: ${ngo.email}`);
        }
      } catch (err) {
        console.error("Failed to send critical need alert:", err.message);
      }
    }

    return need;
  }

  async getAllNeeds(ngoId) {
    return await needRepository.findByNgoId(ngoId);
  }

  async getNeedById(id, ngoId) {
    const need = await needRepository.findById(id, ngoId);

    if (!need) {
      throw new Error("Need not found");
    }

    return need;
  }
}

export default new NeedService();
