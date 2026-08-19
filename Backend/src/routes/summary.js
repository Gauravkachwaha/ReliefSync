import express from "express";
import { generateSummary } from "../controllers/summaryController.js";
import protect from "../middlewares/authMiddleware.js";
import { requireNgoMembership, requireRole } from "../middlewares/authorizationMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(requireNgoMembership);
router.use(requireRole("admin", "coordinator"));
router.post("/generate", generateSummary);

export default router;
