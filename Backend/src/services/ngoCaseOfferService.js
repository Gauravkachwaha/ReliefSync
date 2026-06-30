import complaintRepository from "../repositories/complaintRepository.js";
import ngoCaseOfferRepository from "../repositories/ngoCaseOfferRepository.js";
import volunteerMatchingService from "./volunteerMatchingService.js";

class NgoCaseOfferService {
  createServiceError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  async getIncomingOffers(ngoId, status) {
    // I am expiring old NGO offers before showing them.
    await ngoCaseOfferRepository.expirePendingOffersForNgoId(ngoId);

    return await ngoCaseOfferRepository.findByNgoIdAndStatus(ngoId, status);
  }

  async respondToOffer({ offerId, ngoId, decision }) {
    const normalizedDecision = String(decision || "").toUpperCase();

    if (!["ACCEPT", "REJECT"].includes(normalizedDecision)) {
      throw this.createServiceError("decision must be ACCEPT or REJECT", 400);
    }

    const offer = await ngoCaseOfferRepository.findByIdAndNgoId(offerId, ngoId);

    if (!offer) {
      throw this.createServiceError(
        "Case offer was not found for this NGO",
        404,
      );
    }

    if (offer.status !== "PENDING") {
      throw this.createServiceError(
        `This case offer can no longer be changed because it is ${offer.status}`,
        409,
      );
    }

    if (offer.expiresAt <= new Date()) {
      await ngoCaseOfferRepository.markExpiredIfPending(offer._id, ngoId);

      throw this.createServiceError("This case offer has expired", 410);
    }

    if (normalizedDecision === "REJECT") {
      const rejectedOffer = await ngoCaseOfferRepository.markRejectedIfPending(
        offer._id,
        ngoId,
      );

      if (!rejectedOffer) {
        throw this.createServiceError(
          "This case offer was already updated",
          409,
        );
      }

      return {
        offer: rejectedOffer,
        complaint: null,
        volunteerOffers: [],
        message: "Case offer rejected successfully",
      };
    }

    const acceptedOffer = await ngoCaseOfferRepository.markAcceptedIfPending(
      offer._id,
      ngoId,
    );

    if (!acceptedOffer) {
      throw this.createServiceError("This case offer was already updated", 409);
    }

    try {
      // Only one NGO can claim a complaint because this update is atomic.
      const claimedComplaint = await complaintRepository.claimComplaintForNgo(
        offer.complaintId,
        ngoId,
      );

      if (!claimedComplaint) {
        await ngoCaseOfferRepository.cancelOfferIfAccepted(offer._id, ngoId);

        throw this.createServiceError(
          "Another NGO has already accepted this complaint",
          409,
        );
      }

      await ngoCaseOfferRepository.cancelOtherOpenOffers(
        offer.complaintId,
        offer._id,
      );

      let volunteerDispatch = {
        dispatched: false,
        complaint: claimedComplaint,
        offers: [],
      };

      try {
        // Matching failure must not undo a valid NGO acceptance.
        volunteerDispatch =
          await volunteerMatchingService.dispatchOffersForComplaint(
            claimedComplaint,
          );
      } catch (matchingError) {
        console.error(
          `❌ Volunteer matching failed for complaint ${claimedComplaint.complaintId}:`,
          matchingError.message,
        );
      }

      const finalComplaint = volunteerDispatch.complaint || claimedComplaint;

      const message = volunteerDispatch.dispatched
        ? `Case offer accepted successfully. ${volunteerDispatch.offers.length} volunteer offer(s) were created.`
        : "Case offer accepted successfully. No eligible logged-in volunteers are available yet.";

      console.log(
        `✅ NGO ${ngoId} accepted complaint ${claimedComplaint.complaintId}`,
      );

      return {
        offer: acceptedOffer,
        complaint: finalComplaint,
        volunteerOffers: volunteerDispatch.offers || [],
        message,
      };
    } catch (error) {
      if (!error.status) {
        await ngoCaseOfferRepository.cancelOfferIfAccepted(offer._id, ngoId);
      }

      throw error;
    }
  }
}

export default new NgoCaseOfferService();
