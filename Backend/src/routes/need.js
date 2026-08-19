import express from "express";
import { getAllNeeds, getNeedById } from "../controllers/needController.js";
import protect from "../middlewares/authMiddleware.js";
import { requireNgoMembership, requireRole } from "../middlewares/authorizationMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(requireNgoMembership);
router.use(requireRole("admin", "coordinator"));

router.get("/", getAllNeeds);
router.get("/:id", getNeedById);

export default router;
