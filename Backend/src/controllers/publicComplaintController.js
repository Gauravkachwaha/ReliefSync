import complaintService from "../services/complaintService.js";
import Complaint from "../models/Complaint.js";
import ngoImpactService from "../services/ngoImpactService.js";
import crypto from "crypto";

const allowedSourceTypes = ["TEXT", "AUDIO", "PDF", "IMAGE", "DOCUMENT"];

const submitGuestComplaint = async (req, res, next) => {
  try {
    const { text, locationHint, sourceType = "TEXT" } = req.body || {};

    if (typeof text !== "string" || text.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Complaint text must contain at least 5 characters",
      });
    }

    if (text.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Complaint text cannot exceed 5000 characters",
      });
    }

    if (
      locationHint !== undefined &&
      (typeof locationHint !== "string" || locationHint.trim().length > 300)
    ) {
      return res.status(400).json({
        success: false,
        message: "locationHint must be text with at most 300 characters",
      });
    }

    const normalizedSourceType = String(sourceType).toUpperCase();

    if (!allowedSourceTypes.includes(normalizedSourceType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sourceType",
      });
    }

    const result = await complaintService.createGuestComplaint({
      text,
      locationHint,
      sourceType: normalizedSourceType,
    });

    res.status(201).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const trackGuestComplaint = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { token } = req.query;

    if (typeof token !== "string" || token.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "A valid private tracking token is required",
      });
    }

    const complaint = await complaintService.getTrackedComplaint(
      complaintId,
      token,
    );

    res.json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

const hashTrackingToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const submitComplaintFeedback = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { token, rating, comments } = req.body || {};

    if (typeof token !== "string" || token.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "A valid private tracking token is required",
      });
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5",
      });
    }

    const complaint = await Complaint.findOne({ complaintId }).select("+guestTrackingTokenHash");

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    // Verify token
    const submittedTokenHash = hashTrackingToken(token);
    const storedHashBuffer = Buffer.from(complaint.guestTrackingTokenHash, "hex");
    const submittedHashBuffer = Buffer.from(submittedTokenHash, "hex");

    if (
      storedHashBuffer.length !== submittedHashBuffer.length ||
      !crypto.timingSafeEqual(storedHashBuffer, submittedHashBuffer)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid tracking token",
      });
    }

    if (complaint.status !== "RESOLVED") {
      return res.status(400).json({
        success: false,
        message: "Feedback can only be submitted for resolved complaints",
      });
    }

    complaint.feedback = {
      rating: ratingNum,
      comments: comments ? String(comments).trim().substring(0, 1000) : "",
      submittedAt: new Date(),
    };

    await complaint.save();

    // Trigger NGO impact score recalculation if the complaint has an accepted NGO
    if (complaint.acceptedNgoId) {
      ngoImpactService.recalculateNgoImpact(complaint.acceptedNgoId).catch((err) => {
        console.error("NGO impact recalculation error after feedback:", err.message);
      });
    }

    res.json({
      success: true,
      message: "Feedback submitted successfully",
      data: {
        complaintId: complaint.complaintId,
        feedback: complaint.feedback,
      },
    });
  } catch (error) {
    next(error);
  }
};

export { submitGuestComplaint, trackGuestComplaint, submitComplaintFeedback };
