import express from "express";
import { getRecommendedVolunteers } from "../controllers/matchingController.js";
import protect from "../middlewares/authMiddleware.js";
import { requireNgoMembership, requireRole } from "../middlewares/authorizationMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(requireNgoMembership);
router.use(requireRole("admin", "coordinator"));

router.get("/needs/:needId/recommendations", getRecommendedVolunteers);

export default router;
