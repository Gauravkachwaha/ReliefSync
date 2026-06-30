import Complaint from "../models/Complaint.js";
import Escalation from "../models/Escalation.js";
import NgoCaseOffer from "../models/NgoCaseOffer.js";
import VolunteerOffer from "../models/VolunteerOffer.js";

import notificationService from "./notificationService.js";

class EscalationService {
  isEnabled() {
    return (
      String(process.env.ESCALATION_ENABLED || "true")
        .trim()
        .toLowerCase() === "true"
    );
  }

  getPositiveIntegerEnv(name, defaultValue, maxValue) {
    const value = Number.parseInt(process.env[name], 10);

    if (!Number.isInteger(value) || value < 1) {
      return defaultValue;
    }

    return Math.min(value, maxValue);
  }

  getBatchSize() {
    return this.getPositiveIntegerEnv("ESCALATION_BATCH_SIZE", 100, 500);
  }

  getGraceMinutes() {
    return this.getPositiveIntegerEnv(
      "ESCALATION_INITIAL_GRACE_MINUTES",
      2,
      60,
    );
  }

  getPriority(severity) {
    return severity === "CRITICAL" ? "URGENT" : "HIGH";
  }

  getOfferSummaryMap(offers) {
    const result = new Map();

    for (const offer of offers) {
      const complaintKey = String(offer.complaintId);

      if (!result.has(complaintKey)) {
        result.set(complaintKey, {
          total: 0,
          pending: 0,
          accepted: 0,
        });
      }

      const summary = result.get(complaintKey);

      summary.total += 1;

      if (offer.status === "PENDING") {
        summary.pending += 1;
      }

      if (offer.status === "ACCEPTED") {
        summary.accepted += 1;
      }
    }

    return result;
  }

  async createEscalation({ complaint, reason, message, context }) {
    const existingEscalation = await Escalation.findOne({
      complaintId: complaint._id,
      reason,
      isActive: true,
    });

    if (existingEscalation) {
      return {
        escalation: existingEscalation,
        created: false,
      };
    }

    let escalation;

    try {
      escalation = await Escalation.create({
        complaintId: complaint._id,
        reason,
        priority: this.getPriority(complaint.severity),
        message,
        context,
      });
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }

      escalation = await Escalation.findOne({
        complaintId: complaint._id,
        reason,
        isActive: true,
      });

      return {
        escalation,
        created: false,
      };
    }

    try {
      const notification = await notificationService.createAndQueueNotification(
        {
          idempotencyKey: `escalation-${complaint._id}-${reason}`,

          type: "COMPLAINT_ESCALATED",

          recipientType: "SUPER_ADMIN",

          complaintId: complaint._id,

          channel: "CONSOLE",

          subject: `Escalation required: ${complaint.complaintId}`,

          message,

          payload: {
            escalationId: escalation._id,
            complaintPublicId: complaint.complaintId,
            escalationReason: reason,
            priority: escalation.priority,
            category: complaint.category || null,
            severity: complaint.severity || null,
            locationHint: complaint.locationHint || null,
            context,
          },
        },
      );

      escalation.notificationLogId = notification._id;
      await escalation.save();
    } catch (error) {
      console.warn(
        `⚠️ Escalation was created but notification could not be queued: ${error.message}`,
      );
    }

    console.log(
      `🚨 Escalation created: ${reason} for ${complaint.complaintId}`,
    );

    return {
      escalation,
      created: true,
    };
  }

  async scanNgoEscalations(cutoffDate) {
    const complaints = await Complaint.find({
      status: "NGOS_NOTIFIED",

      acceptedNgoId: null,

      updatedAt: {
        $lte: cutoffDate,
      },
    })
      .select(
        [
          "_id",
          "complaintId",
          "category",
          "severity",
          "locationHint",
          "candidateNgoIds",
          "updatedAt",
        ].join(" "),
      )
      .sort({
        updatedAt: 1,
      })
      .limit(this.getBatchSize())
      .lean();

    if (complaints.length === 0) {
      return {
        checkedCount: 0,
        createdCount: 0,
      };
    }

    const complaintIds = complaints.map((complaint) => complaint._id);

    const offers = await NgoCaseOffer.find({
      complaintId: {
        $in: complaintIds,
      },
    })
      .select("complaintId status")
      .lean();

    const offerSummaryByComplaint = this.getOfferSummaryMap(offers);

    let createdCount = 0;

    for (const complaint of complaints) {
      const offerSummary = offerSummaryByComplaint.get(
        String(complaint._id),
      ) || {
        total: 0,
        pending: 0,
        accepted: 0,
      };

      const hasActiveOffer =
        offerSummary.pending > 0 || offerSummary.accepted > 0;

      if (hasActiveOffer) {
        continue;
      }

      const candidateNgoCount = Array.isArray(complaint.candidateNgoIds)
        ? complaint.candidateNgoIds.length
        : 0;

      // Escalate only if:
      // 1. offers existed but none remain active, OR
      // 2. no NGO candidate was ever found.
      const shouldEscalate = offerSummary.total > 0 || candidateNgoCount === 0;

      if (!shouldEscalate) {
        continue;
      }

      const result = await this.createEscalation({
        complaint,

        reason: "NO_ELIGIBLE_NGO",

        message:
          `No eligible NGO is currently available for complaint ` +
          `${complaint.complaintId}. Manual coordination is required.`,

        context: {
          category: complaint.category || null,
          severity: complaint.severity || null,
          locationHint: complaint.locationHint || null,
          totalNgoOffers: offerSummary.total,
          pendingNgoOffers: offerSummary.pending,
          acceptedNgoOffers: offerSummary.accepted,
          candidateNgoCount,
        },
      });

      if (result.created) {
        createdCount += 1;
      }
    }

    return {
      checkedCount: complaints.length,
      createdCount,
    };
  }

  async scanVolunteerEscalations(cutoffDate) {
    const complaints = await Complaint.find({
      status: {
        $in: ["VOLUNTEER_MATCHING", "PARTIALLY_ASSIGNED"],
      },

      acceptedNgoId: {
        $ne: null,
      },

      updatedAt: {
        $lte: cutoffDate,
      },
    })
      .select(
        [
          "_id",
          "complaintId",
          "category",
          "severity",
          "locationHint",
          "requiredPeople",
          "assignedPeopleCount",
          "acceptedNgoId",
          "updatedAt",
        ].join(" "),
      )
      .sort({
        updatedAt: 1,
      })
      .limit(this.getBatchSize())
      .lean();

    if (complaints.length === 0) {
      return {
        checkedCount: 0,
        createdCount: 0,
      };
    }

    const incompleteComplaints = complaints.filter(
      (complaint) =>
        Number(complaint.assignedPeopleCount || 0) <
        Number(complaint.requiredPeople || 1),
    );

    if (incompleteComplaints.length === 0) {
      return {
        checkedCount: complaints.length,
        createdCount: 0,
      };
    }

    const complaintIds = incompleteComplaints.map((complaint) => complaint._id);

    const offers = await VolunteerOffer.find({
      complaintId: {
        $in: complaintIds,
      },
    })
      .select("complaintId status")
      .lean();

    const offerSummaryByComplaint = this.getOfferSummaryMap(offers);

    let createdCount = 0;

    for (const complaint of incompleteComplaints) {
      const offerSummary = offerSummaryByComplaint.get(
        String(complaint._id),
      ) || {
        total: 0,
        pending: 0,
        accepted: 0,
      };

      const hasActiveOffer =
        offerSummary.pending > 0 || offerSummary.accepted > 0;

      if (hasActiveOffer) {
        continue;
      }

      const remainingVolunteerCount =
        Math.max(1, Number(complaint.requiredPeople || 1)) -
        Math.max(0, Number(complaint.assignedPeopleCount || 0));

      const result = await this.createEscalation({
        complaint,

        reason: "NO_ELIGIBLE_VOLUNTEER",

        message:
          `${remainingVolunteerCount} more volunteer(s) are required ` +
          `for complaint ${complaint.complaintId}, but no eligible ` +
          `volunteer offer is active. Manual coordination is required.`,

        context: {
          category: complaint.category || null,
          severity: complaint.severity || null,
          locationHint: complaint.locationHint || null,
          acceptedNgoId: complaint.acceptedNgoId,
          requiredPeople: complaint.requiredPeople || 1,
          assignedPeopleCount: complaint.assignedPeopleCount || 0,
          remainingVolunteerCount,
          totalVolunteerOffers: offerSummary.total,
          pendingVolunteerOffers: offerSummary.pending,
          acceptedVolunteerOffers: offerSummary.accepted,
        },
      });

      if (result.created) {
        createdCount += 1;
      }
    }

    return {
      checkedCount: incompleteComplaints.length,
      createdCount,
    };
  }

  async runSweep() {
    if (!this.isEnabled()) {
      return {
        enabled: false,
        ngo: {
          checkedCount: 0,
          createdCount: 0,
        },
        volunteer: {
          checkedCount: 0,
          createdCount: 0,
        },
      };
    }

    const cutoffDate = new Date(
      Date.now() - this.getGraceMinutes() * 60 * 1000,
    );

    const [ngoResult, volunteerResult] = await Promise.all([
      this.scanNgoEscalations(cutoffDate),
      this.scanVolunteerEscalations(cutoffDate),
    ]);

    console.log(
      `🚨 Escalation sweep complete. NGO: ${ngoResult.createdCount}/${ngoResult.checkedCount}, Volunteer: ${volunteerResult.createdCount}/${volunteerResult.checkedCount}`,
    );

    return {
      enabled: true,
      cutoffDate: cutoffDate.toISOString(),
      ngo: ngoResult,
      volunteer: volunteerResult,
    };
  }
}

export default new EscalationService();
