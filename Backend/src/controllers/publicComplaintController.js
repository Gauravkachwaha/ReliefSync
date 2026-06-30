import complaintService from "../services/complaintService.js";

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

export { submitGuestComplaint, trackGuestComplaint };
