import express from "express";
import aiService from "../services/aiService.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "ReliefSync AI Backend is healthy ✅",
    timestamp: new Date().toISOString(),
  });
});

router.get("/ai-service", async (req, res) => {
  try {
    const data = await aiService.pingFastApiService();

    res.json({
      success: true,
      message: "Express backend is connected to FastAPI AI service",
      data,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
