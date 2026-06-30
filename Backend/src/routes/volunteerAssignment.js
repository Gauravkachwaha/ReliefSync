import express from "express";
import protect from "../middlewares/authMiddleware.js";
import {
  getMyAssignments,
  updateMyAssignmentProgress,
} from "../controllers/volunteerAssignmentController.js";

const router = express.Router();

router.use(protect);

router.get("/me", getMyAssignments);

router.patch("/:assignmentId/progress", updateMyAssignmentProgress);

export default router;
