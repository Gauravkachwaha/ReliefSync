import aiService from "./aiService.js";
import summaryRepository from "../repositories/summaryRepository.js";
import crypto from "crypto";

// I am storing generated summaries in memory to avoid repeated FastAPI calls.
const summaryCache = new Map();

class SummaryService {
  async generateUrgentNeedSummary(need) {
    // I am including the need data in the key so changed need details create a new summary.
    const cacheKey = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          needId: need._id.toString(),
          title: need.title || "",
          priority: need.priority || "",
          extractedData: need.extractedData || {},
        }),
      )
      .digest("hex");

    if (summaryCache.has(cacheKey)) {
      console.log(`✅ Summary cache hit for need ${need._id}`);
      return summaryCache.get(cacheKey);
    }

    try {
      const summaryResult = await aiService.generateNeedSummary(
        need.title,
        need.priority,
        need.extractedData || {},
      );

      const generatedText = summaryResult.summary;

      summaryCache.set(cacheKey, generatedText);

      console.log(`✅ FastAPI summary generated for need ${need._id}`);

      return generatedText;
    } catch (err) {
      console.error("❌ FastAPI summary generation failed:", err.message);
      throw err;
    }
  }

  async createSummary(need) {
    // I am first checking MongoDB so one need does not get duplicate summaries.
    const existing = await summaryRepository.findByNeedId(need._id);

    if (existing) {
      return existing;
    }

    const generatedText = await this.generateUrgentNeedSummary(need);

    const summaryData = {
      reportId: need.reportId,
      needId: need._id,
      ngoId: need.ngoId,
      summaryType: "urgent_need",
      generatedText,
      generatedBy: "fastapi",
    };

    return await summaryRepository.create(summaryData);
  }
}

export default new SummaryService();
