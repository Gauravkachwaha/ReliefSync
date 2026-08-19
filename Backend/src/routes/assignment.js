import express from "express";
import {
  createAssignment,
  getAllAssignments,
  updateAssignmentStatus,
} from "../controllers/assignmentController.js";
import protect from "../middlewares/authMiddleware.js";
import { requireNgoMembership, requireRole } from "../middlewares/authorizationMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(requireNgoMembership);
router.use(requireRole("admin", "coordinator"));

router.post("/", createAssignment);
router.get("/", getAllAssignments);
router.put("/:id/status", updateAssignmentStatus);

export default router;
