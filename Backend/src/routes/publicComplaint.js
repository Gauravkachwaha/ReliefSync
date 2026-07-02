import express from "express";
import rateLimit from "express-rate-limit";
import {
  submitGuestComplaint,
  trackGuestComplaint,
  submitComplaintFeedback,
} from "../controllers/publicComplaintController.js";

const router = express.Router();

const complaintSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many complaint submissions from this network. Please try again after 15 minutes.",
  },
});

const complaintTrackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many tracking attempts from this network. Please try again later.",
  },
});

// No protect middleware here: these endpoints are public.
router.post("/", complaintSubmissionLimiter, submitGuestComplaint);

router.get("/:complaintId", complaintTrackingLimiter, trackGuestComplaint);

router.post("/:complaintId/feedback", complaintTrackingLimiter, submitComplaintFeedback);

export default router;
