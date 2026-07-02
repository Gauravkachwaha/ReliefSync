import ngoRepository from "../repositories/ngoRepository.js";
import Complaint from "../models/Complaint.js";
import Escalation from "../models/Escalation.js";
import NotificationLog from "../models/NotificationLog.js";
import AgentRun from "../models/AgentRun.js";
import NGO from "../models/NGO.js";
import Volunteer from "../models/Volunteer.js";
import complaintService from "../services/complaintService.js";
import ngoRedispatchService from "../services/ngoRedispatchService.js";

const allowedVerificationStatuses = ["PENDING", "VERIFIED", "REJECTED"];

const getNgoVerificationQueue = async (req, res, next) => {
  try {
    const requestedStatus = String(req.query.status || "PENDING").toUpperCase();

    if (!allowedVerificationStatuses.includes(requestedStatus)) {
      return res.status(400).json({
        success: false,
        message: "status must be PENDING, VERIFIED, or REJECTED",
      });
    }

    const ngos = await ngoRepository.findByVerificationStatus(requestedStatus);

    res.json({
      success: true,
      count: ngos.length,
      data: ngos,
    });
  } catch (error) {
    next(error);
  }
};

const updateNgoVerification = async (req, res, next) => {
  try {
    const { ngoId } = req.params;
    const { verificationStatus } = req.body || {};

    const normalizedStatus = String(verificationStatus || "").toUpperCase();

    // Super Admin can only approve or reject from this endpoint.
    if (!["VERIFIED", "REJECTED"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "verificationStatus must be VERIFIED or REJECTED",
      });
    }

    const ngo = await ngoRepository.updateById(ngoId, {
      verificationStatus: normalizedStatus,
    });

    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: "NGO not found",
      });
    }

    res.json({
      success: true,
      message: `NGO marked as ${normalizedStatus}`,
      data: ngo,
    });
  } catch (error) {
    next(error);
  }
};

const getSpamReviewQueue = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({
      $or: [
        { status: "REVIEW_REQUIRED" },
        { finalSpamDecision: "HOLD_FOR_REVIEW" }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (error) {
    next(error);
  }
};

const resolveSpamReview = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { decision } = req.body || {};

    const normalizedDecision = String(decision || "").toUpperCase();
    if (!["ALLOW", "BLOCK"].includes(normalizedDecision)) {
      return res.status(400).json({
        success: false,
        message: "decision must be ALLOW or BLOCK",
      });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (normalizedDecision === "ALLOW") {
      complaint.finalSpamDecision = "ALLOW";
      complaint.status = "READY_FOR_ROUTING";
      await complaint.save();

      if (!complaint.category) {
        complaintService.processAllowedComplaint(complaint).catch((err) => {
          console.error("Spam override processing failed:", err.message);
        });
      } else {
        ngoRedispatchService.dispatchNextNgoWave({
          complaintId: complaint._id,
          trigger: "INITIAL_ROUTING",
        }).catch((err) => {
          console.error("NGO routing failed after spam override:", err.message);
        });
      }
    } else {
      complaint.finalSpamDecision = "BLOCK";
      complaint.status = "BLOCKED";
      await complaint.save();
    }

    res.json({
      success: true,
      message: `Complaint marked as ${normalizedDecision}`,
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

const getEscalations = async (req, res, next) => {
  try {
    const { status = "OPEN" } = req.query;
    const query = { status: String(status).toUpperCase() };
    const escalations = await Escalation.find(query)
      .populate("complaintId", "complaintId originalText category severity locationHint status")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: escalations.length,
      data: escalations,
    });
  } catch (error) {
    next(error);
  }
};

const resolveEscalation = async (req, res, next) => {
  try {
    const { escalationId } = req.params;
    const { resolvedNote } = req.body || {};

    const escalation = await Escalation.findById(escalationId);
    if (!escalation) {
      return res.status(404).json({
        success: false,
        message: "Escalation not found",
      });
    }

    escalation.status = "RESOLVED";
    escalation.isActive = false;
    escalation.resolvedAt = new Date();
    escalation.resolvedNote = resolvedNote ? String(resolvedNote).trim() : "Resolved by Super Admin.";
    await escalation.save();

    res.json({
      success: true,
      message: "Escalation resolved successfully",
      data: escalation,
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const notifications = await NotificationLog.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const agentRuns = await AgentRun.find()
      .populate("complaintId", "complaintId")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.json({
      success: true,
      data: {
        notifications,
        agentRuns,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSystemAnalytics = async (req, res, next) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const spamCount = await Complaint.countDocuments({ finalSpamDecision: "BLOCK" });
    const activeCases = await Complaint.countDocuments({
      status: {
        $in: [
          "NGO_ACCEPTED",
          "VOLUNTEER_MATCHING",
          "PARTIALLY_ASSIGNED",
          "FULLY_ASSIGNED",
          "IN_PROGRESS",
        ],
      },
    });
    const resolvedCases = await Complaint.countDocuments({ status: "RESOLVED" });
    const totalNgos = await NGO.countDocuments();
    const verifiedNgos = await NGO.countDocuments({ verificationStatus: "VERIFIED" });
    const totalVolunteers = await Volunteer.countDocuments();

    res.json({
      success: true,
      data: {
        totalComplaints,
        spamCount,
        activeCases,
        resolvedCases,
        totalNgos,
        verifiedNgos,
        totalVolunteers,
      },
    });
  } catch (error) {
    next(error);
  }
};

export {
  getNgoVerificationQueue,
  updateNgoVerification,
  getSpamReviewQueue,
  resolveSpamReview,
  getEscalations,
  resolveEscalation,
  getAuditLogs,
  getSystemAnalytics,
};
