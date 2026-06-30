import NgoCaseOffer from "../models/NgoCaseOffer.js";

import { getNgoOfferExpiryConfig } from "../config/ngoOfferExpiryConfig.js";
import ngoRedispatchService from "./ngoRedispatchService.js";

class NgoOfferExpiryService {
  getOverdueFilter(now) {
    const { offerExpiryMinutes } = getNgoOfferExpiryConfig();

    const fallbackExpiryCutoff = new Date(
      now.getTime() - offerExpiryMinutes * 60 * 1000,
    );

    return {
      status: "PENDING",

      $or: [
        {
          expiresAt: {
            $lte: now,
          },
        },

        {
          expiresAt: null,
          createdAt: {
            $lte: fallbackExpiryCutoff,
          },
        },
      ],
    };
  }

  async expirePendingOffers() {
    const now = new Date();

    const { batchSize } = getNgoOfferExpiryConfig();

    const overdueOffers = await NgoCaseOffer.find(this.getOverdueFilter(now))
      .select("_id complaintId ngoId createdAt expiresAt dispatchWave")
      .sort({
        createdAt: 1,
      })
      .limit(batchSize)
      .lean();

    const expiredComplaintIds = new Set();

    let expiredCount = 0;
    let skippedCount = 0;

    for (const offer of overdueOffers) {
      const expiredOffer = await NgoCaseOffer.findOneAndUpdate(
        {
          _id: offer._id,
          ...this.getOverdueFilter(now),
        },

        {
          $set: {
            status: "EXPIRED",
            expiredAt: now,
          },
        },

        {
          new: true,
        },
      ).lean();

      if (!expiredOffer) {
        skippedCount += 1;
        continue;
      }

      expiredCount += 1;

      expiredComplaintIds.add(String(expiredOffer.complaintId));

      console.log(
        `⌛ NGO offer expired: ${expiredOffer._id} for complaint ${expiredOffer.complaintId}`,
      );
    }

    const redispatchResults = [];

    for (const complaintId of expiredComplaintIds) {
      const result = await ngoRedispatchService.dispatchNextNgoWave({
        complaintId,
        trigger: "OFFER_EXPIRY",
      });

      redispatchResults.push(result);
    }

    const redispatchedCount = redispatchResults.filter(
      (result) => result.dispatched,
    ).length;

    console.log(
      `⏱ NGO offer expiry sweep complete. Checked=${overdueOffers.length}, Expired=${expiredCount}, Redispatched=${redispatchedCount}, Skipped=${skippedCount}`,
    );

    return {
      checkedCount: overdueOffers.length,
      expiredCount,
      redispatchedCount,
      skippedCount,
      redispatchResults,
      processedAt: now.toISOString(),
    };
  }
}

export default new NgoOfferExpiryService();
