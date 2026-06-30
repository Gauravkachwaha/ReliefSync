import Complaint from "../models/Complaint.js";
import NGO from "../models/NGO.js";
import NgoCaseOffer from "../models/NgoCaseOffer.js";

import { getNgoOfferExpiryConfig } from "../config/ngoOfferExpiryConfig.js";
import { getNgoRedispatchConfig } from "../config/ngoRedispatchConfig.js";
import notificationService from "./notificationService.js";

const ROUTABLE_COMPLAINT_STATUSES = ["READY_FOR_ROUTING", "NGOS_NOTIFIED"];

const ACTIVE_NGO_CASE_STATUSES = [
  "NGO_ACCEPTED",
  "VOLUNTEER_MATCHING",
  "PARTIALLY_ASSIGNED",
  "FULLY_ASSIGNED",
  "IN_PROGRESS",
];

class NgoRedispatchService {
  isNgoOfferNotificationEnabled() {
    return (
      String(process.env.NOTIFICATION_NGO_OFFER_ENABLED || "true")
        .trim()
        .toLowerCase() === "true"
    );
  }

  normalizeText(value = "") {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  getTextTokens(value = "") {
    return this.normalizeText(value)
      .split(" ")
      .filter((token) => token.length >= 4);
  }

  getServiceAreaTexts(serviceAreas = []) {
    const values = [];

    for (const serviceArea of serviceAreas || []) {
      if (typeof serviceArea === "string") {
        values.push(serviceArea);
        continue;
      }

      if (serviceArea && typeof serviceArea === "object") {
        const possibleValues = [
          serviceArea.name,
          serviceArea.area,
          serviceArea.city,
          serviceArea.district,
          serviceArea.state,
          serviceArea.label,
        ];

        for (const value of possibleValues) {
          if (typeof value === "string") {
            values.push(value);
          }
        }
      }
    }

    return values;
  }

  getLocationMatchScore(locationHint, serviceAreas) {
    const complaintLocation = this.normalizeText(locationHint);

    const ngoLocations = this.getServiceAreaTexts(serviceAreas);

    if (!complaintLocation || ngoLocations.length === 0) {
      return {
        matches: true,
        score: 10,
      };
    }

    const complaintTokens = this.getTextTokens(complaintLocation);

    for (const ngoLocation of ngoLocations) {
      const normalizedNgoLocation = this.normalizeText(ngoLocation);

      if (
        complaintLocation.includes(normalizedNgoLocation) ||
        normalizedNgoLocation.includes(complaintLocation)
      ) {
        return {
          matches: true,
          score: 100,
        };
      }

      const ngoTokenSet = new Set(this.getTextTokens(normalizedNgoLocation));

      const commonTokenCount = complaintTokens.filter((token) =>
        ngoTokenSet.has(token),
      ).length;

      if (commonTokenCount >= 1) {
        return {
          matches: true,
          score: 60,
        };
      }
    }

    return {
      matches: false,
      score: 0,
    };
  }

  getNgoCapacityLimit(ngo) {
    const { defaultMaxActiveCases } = getNgoRedispatchConfig();

    const configuredLimit = Number(
      ngo.capacityConfig?.maxConcurrent ??
        ngo.capacityConfig?.maxConcurrentCases ??
        defaultMaxActiveCases,
    );

    if (!Number.isFinite(configuredLimit) || configuredLimit < 1) {
      return defaultMaxActiveCases;
    }

    return configuredLimit;
  }

  getOfferBatchSize(severity) {
    const { batchSize, highSeverityBatchSize } = getNgoRedispatchConfig();

    if (severity === "HIGH" || severity === "CRITICAL") {
      return highSeverityBatchSize;
    }

    return batchSize;
  }

  async getActiveCaseCountsByNgo(ngoIds) {
    if (ngoIds.length === 0) {
      return new Map();
    }

    const rows = await Complaint.aggregate([
      {
        $match: {
          acceptedNgoId: {
            $in: ngoIds,
          },

          status: {
            $in: ACTIVE_NGO_CASE_STATUSES,
          },
        },
      },

      {
        $group: {
          _id: "$acceptedNgoId",
          activeCaseCount: {
            $sum: 1,
          },
        },
      },
    ]);

    return new Map(rows.map((row) => [String(row._id), row.activeCaseCount]));
  }

  async findRankedEligibleNgos(complaint, previouslyOfferedNgoIds) {
    const category = String(complaint.category || "").trim();

    if (!category) {
      return [];
    }

    const candidateNgos = await NGO.find({
      verificationStatus: "VERIFIED",

      supportedCategories: category,

      _id: {
        $nin: previouslyOfferedNgoIds,
      },
    })
      .select(
        [
          "_id",
          "name",
          "email",
          "userId",
          "supportedCategories",
          "serviceAreas",
          "capacityConfig",
          "responseSlaMinutes",
          "reliabilityScore",
        ].join(" "),
      )
      .lean();

    const activeCaseCounts = await this.getActiveCaseCountsByNgo(
      candidateNgos.map((ngo) => ngo._id),
    );

    const rankedNgos = [];

    for (const ngo of candidateNgos) {
      const locationResult = this.getLocationMatchScore(
        complaint.locationHint,
        ngo.serviceAreas,
      );

      if (!locationResult.matches) {
        continue;
      }

      const maxActiveCases = this.getNgoCapacityLimit(ngo);

      const activeCaseCount = activeCaseCounts.get(String(ngo._id)) || 0;

      if (activeCaseCount >= maxActiveCases) {
        continue;
      }

      const availableCapacity = maxActiveCases - activeCaseCount;

      const capacityScore = (availableCapacity / maxActiveCases) * 25;

      const responseSlaMinutes = Number(ngo.responseSlaMinutes || 60);

      const responseScore = Math.max(0, 25 - Math.min(responseSlaMinutes, 25));

      const reliabilityScore = Math.max(
        0,
        Math.min(100, Number(ngo.reliabilityScore || 0)),
      );

      const finalScore =
        locationResult.score +
        capacityScore +
        responseScore +
        reliabilityScore * 0.1;

      rankedNgos.push({
        ngo,
        finalScore: Number(finalScore.toFixed(4)),
      });
    }

    return rankedNgos.sort(
      (first, second) => second.finalScore - first.finalScore,
    );
  }

  async queueNgoOfferNotifications({
    complaint,
    dispatchWave,
    trigger,
    offers,
  }) {
    if (!this.isNgoOfferNotificationEnabled()) {
      return;
    }

    const results = await Promise.allSettled(
      offers.map(({ ngo, offer }) =>
        notificationService.createAndQueueNotification({
          idempotencyKey: `ngo-case-offer-${offer._id}`,

          type: "NGO_CASE_OFFER_CREATED",

          recipientType: "NGO",

          recipientUserId: ngo.userId || null,

          ngoId: ngo._id,

          complaintId: complaint._id,

          ngoCaseOfferId: offer._id,

          channel: "CONSOLE",

          subject: `New relief case offer: ${complaint.complaintId}`,

          message:
            `A ${complaint.severity || "MEDIUM"} priority ` +
            `${complaint.category || "GENERAL_SUPPORT"} case ` +
            `is available near ${complaint.locationHint || "the reported location"}. ` +
            `Please respond before ${offer.expiresAt.toISOString()}.`,

          payload: {
            complaintPublicId: complaint.complaintId,
            category: complaint.category || null,
            severity: complaint.severity || null,
            locationHint: complaint.locationHint || null,
            expiresAt: offer.expiresAt,
            dispatchWave,
            trigger,
          },
        }),
      ),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.warn(
          `⚠️ NGO notification could not be created: ${result.reason?.message || "Unknown error"}`,
        );
      }
    }
  }

  async dispatchNextNgoWave({ complaintId, trigger = "OFFER_EXPIRY" }) {
    const now = new Date();

    const { lockSeconds } = getNgoRedispatchConfig();

    const lockUntil = new Date(now.getTime() + lockSeconds * 1000);

    const lockedComplaint = await Complaint.findOneAndUpdate(
      {
        _id: complaintId,

        acceptedNgoId: null,

        status: {
          $in: ROUTABLE_COMPLAINT_STATUSES,
        },

        $or: [
          {
            ngoDispatchLockUntil: null,
          },
          {
            ngoDispatchLockUntil: {
              $lte: now,
            },
          },
        ],
      },

      {
        $set: {
          ngoDispatchLockUntil: lockUntil,
        },
      },

      {
        new: true,
      },
    );

    if (!lockedComplaint) {
      return {
        dispatched: false,
        reason: "COMPLAINT_NOT_ROUTEABLE_OR_ALREADY_LOCKED",
      };
    }

    try {
      const hasPendingOffer = await NgoCaseOffer.exists({
        complaintId: lockedComplaint._id,
        status: "PENDING",
      });

      if (hasPendingOffer) {
        return {
          dispatched: false,
          reason: "PENDING_NGO_OFFER_ALREADY_EXISTS",
        };
      }

      const previousOffers = await NgoCaseOffer.find({
        complaintId: lockedComplaint._id,
      })
        .select("ngoId dispatchWave")
        .lean();

      const previouslyOfferedNgoIds = previousOffers.map(
        (offer) => offer.ngoId,
      );

      const rankedNgos = await this.findRankedEligibleNgos(
        lockedComplaint,
        previouslyOfferedNgoIds,
      );

      if (rankedNgos.length === 0) {
        console.log(
          `⚠️ No remaining eligible NGO found for complaint ${lockedComplaint.complaintId}`,
        );

        return {
          dispatched: false,
          reason: "NO_REMAINING_ELIGIBLE_NGOS",
          complaintId: lockedComplaint._id,
        };
      }

      const maxPreviousWave = previousOffers.reduce(
        (maximumWave, offer) =>
          Math.max(maximumWave, Number(offer.dispatchWave || 1)),
        0,
      );

      const dispatchWave = maxPreviousWave + 1;

      const batchSize = this.getOfferBatchSize(lockedComplaint.severity);

      const nextWave = rankedNgos.slice(0, batchSize);

      const { offerExpiryMinutes } = getNgoOfferExpiryConfig();

      const expiresAt = new Date(
        now.getTime() + offerExpiryMinutes * 60 * 1000,
      );

      const nextNgoIds = nextWave.map(({ ngo }) => ngo._id);

      await NgoCaseOffer.bulkWrite(
        nextWave.map(({ ngo }) => ({
          updateOne: {
            filter: {
              complaintId: lockedComplaint._id,
              ngoId: ngo._id,
            },

            update: {
              $setOnInsert: {
                complaintId: lockedComplaint._id,
                ngoId: ngo._id,
                status: "PENDING",
                expiresAt,
                expiredAt: null,
                dispatchWave,
                createdAt: now,
                updatedAt: now,
              },
            },

            upsert: true,
          },
        })),
      );

      const complaintUpdate = {
        $set: {
          status: "NGOS_NOTIFIED",
          lastNgoRedispatchAt: now,
        },

        $addToSet: {
          candidateNgoIds: {
            $each: nextNgoIds,
          },
        },
      };

      if (trigger !== "INITIAL_ROUTING") {
        complaintUpdate.$inc = {
          ngoRedispatchCount: 1,
        };
      }

      const updatedComplaint = await Complaint.findOneAndUpdate(
        {
          _id: lockedComplaint._id,
          acceptedNgoId: null,
        },
        complaintUpdate,
        {
          new: true,
        },
      );

      if (!updatedComplaint) {
        await NgoCaseOffer.updateMany(
          {
            complaintId: lockedComplaint._id,

            ngoId: {
              $in: nextNgoIds,
            },

            status: "PENDING",
            dispatchWave,
          },

          {
            $set: {
              status: "CANCELLED",
              cancelledAt: new Date(),
              cancellationReason: "COMPLAINT_WAS_ACCEPTED_DURING_DISPATCH",
            },
          },
        );

        return {
          dispatched: false,
          reason: "COMPLAINT_WAS_ACCEPTED_DURING_DISPATCH",
        };
      }

      const createdOffers = await NgoCaseOffer.find({
        complaintId: updatedComplaint._id,

        ngoId: {
          $in: nextNgoIds,
        },

        status: "PENDING",
        dispatchWave,
      })
        .select("_id ngoId expiresAt dispatchWave")
        .lean();

      const offerByNgoId = new Map(
        createdOffers.map((offer) => [String(offer.ngoId), offer]),
      );

      await this.queueNgoOfferNotifications({
        complaint: updatedComplaint,
        dispatchWave,
        trigger,
        offers: nextWave
          .map(({ ngo }) => ({
            ngo,
            offer: offerByNgoId.get(String(ngo._id)),
          }))
          .filter(({ offer }) => Boolean(offer)),
      });

      console.log(
        `📨 NGO wave ${dispatchWave} created for ${updatedComplaint.complaintId}. NGOs=${nextNgoIds.length}, Trigger=${trigger}`,
      );

      return {
        dispatched: true,
        complaint: updatedComplaint,
        dispatchWave,
        offeredNgoIds: nextNgoIds,
        expiresAt,
      };
    } finally {
      await Complaint.updateOne(
        {
          _id: lockedComplaint._id,
        },
        {
          $set: {
            ngoDispatchLockUntil: null,
          },
        },
      );
    }
  }
}

export default new NgoRedispatchService();
