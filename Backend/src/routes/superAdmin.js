import express from "express";
import protect from "../middlewares/authMiddleware.js";
import requireSuperAdmin from "../middlewares/superAdminMiddleware.js";
import {
  getNgoVerificationQueue,
  updateNgoVerification,
  getSpamReviewQueue,
  resolveSpamReview,
  getEscalations,
  resolveEscalation,
  getAuditLogs,
  getSystemAnalytics,
} from "../controllers/superAdminController.js";

const router = express.Router();

router.use(protect);
router.use(requireSuperAdmin);

router.get("/ngos", getNgoVerificationQueue);

router.patch("/ngos/:ngoId/verification", updateNgoVerification);

router.get("/spam-queue", getSpamReviewQueue);
router.patch("/spam-queue/:complaintId/decision", resolveSpamReview);

router.get("/escalations", getEscalations);
router.patch("/escalations/:escalationId/resolve", resolveEscalation);

router.get("/audit-logs", getAuditLogs);
router.get("/analytics", getSystemAnalytics);

export default router;
