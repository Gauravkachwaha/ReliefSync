import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { requireNgoMembership, requireRole } from "../middlewares/authorizationMiddleware.js";
import {
  getMyAssignments,
  updateMyAssignmentProgress,
} from "../controllers/volunteerAssignmentController.js";

const router = express.Router();

router.use(protect);
router.use(requireNgoMembership);
router.use(requireRole("volunteer"));

router.get("/me", getMyAssignments);

router.patch("/:assignmentId/progress", updateMyAssignmentProgress);

export default router;
