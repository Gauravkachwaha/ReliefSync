import assignmentRepository from "../repositories/assignmentRepository.js";
import complaintRepository from "../repositories/complaintRepository.js";
import volunteerOfferRepository from "../repositories/volunteerOfferRepository.js";
import volunteerRepository from "../repositories/volunteerRepository.js";
import volunteerMatchingService from "./volunteerMatchingService.js";

class VolunteerOfferService {
  createServiceError(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  async reDispatchForExpiredOffers(expiredOffers) {
    for (const expiredOffer of expiredOffers) {
      try {
        const complaint = await complaintRepository.findById(
          expiredOffer.complaintId,
        );

        if (!complaint) {
          continue;
        }

        await volunteerMatchingService.dispatchAdditionalOffersForComplaint(
          complaint,
          "OFFER_EXPIRED",
        );
      } catch (error) {
        console.error(
          `❌ Re-dispatch failed after offer expiry ${expiredOffer._id}:`,
          error.message,
        );
      }
    }
  }

  async getMyOffers(userId, ngoId, status) {
    const volunteer = await volunteerRepository.findByUserId(userId, ngoId);

    if (!volunteer) {
      throw this.createServiceError(
        "Volunteer profile is not linked to this account",
        404,
      );
    }

    // I am detecting expired offers before showing the list.
    const expiredOffers =
      await volunteerOfferRepository.findExpiredPendingByVolunteerId(
        volunteer._id,
      );

    for (const expiredOffer of expiredOffers) {
      await volunteerOfferRepository.markExpiredIfPending(
        expiredOffer._id,
        volunteer._id,
      );
    }

    // I am offering the case to the next eligible people after expiry.
    if (expiredOffers.length > 0) {
      await this.reDispatchForExpiredOffers(expiredOffers);
    }

    return await volunteerOfferRepository.findByVolunteerIdAndStatus(
      volunteer._id,
      status,
    );
  }

  async respondToOffer({ offerId, userId, ngoId, decision }) {
    const normalizedDecision = String(decision || "").toUpperCase();

    if (!["ACCEPT", "REJECT"].includes(normalizedDecision)) {
      throw this.createServiceError("decision must be ACCEPT or REJECT");
    }

    const volunteer = await volunteerRepository.findByUserId(userId, ngoId);

    if (!volunteer) {
      throw this.createServiceError(
        "Volunteer profile is not linked to this account",
        404,
      );
    }

    const offer = await volunteerOfferRepository.findByIdAndVolunteerId(
      offerId,
      volunteer._id,
    );

    if (!offer) {
      throw this.createServiceError("Volunteer offer was not found", 404);
    }

    if (offer.status !== "PENDING") {
      throw this.createServiceError(
        `This offer can no longer be changed because it is ${offer.status}`,
        409,
      );
    }

    if (offer.expiresAt <= new Date()) {
      const expiredOffer = await volunteerOfferRepository.markExpiredIfPending(
        offer._id,
        volunteer._id,
      );

      if (expiredOffer) {
        await this.reDispatchForExpiredOffers([expiredOffer]);
      }

      throw this.createServiceError("This volunteer offer has expired", 410);
    }

    if (normalizedDecision === "REJECT") {
      const rejectedOffer =
        await volunteerOfferRepository.markRejectedIfPending(
          offer._id,
          volunteer._id,
        );

      if (!rejectedOffer) {
        throw this.createServiceError(
          "This volunteer offer was already updated",
          409,
        );
      }

      const complaint = await complaintRepository.findById(offer.complaintId);

      let replacementOffers = [];

      if (complaint) {
        const redispatch =
          await volunteerMatchingService.dispatchAdditionalOffersForComplaint(
            complaint,
            "OFFER_REJECTED",
          );

        replacementOffers = redispatch.offers || [];
      }

      return {
        offer: rejectedOffer,
        assignment: null,
        complaint: null,
        replacementOffersCreated: replacementOffers.length,
        message:
          replacementOffers.length > 0
            ? "Volunteer offer rejected. The case was offered to the next eligible volunteer."
            : "Volunteer offer rejected successfully.",
      };
    }

    const acceptedOffer = await volunteerOfferRepository.markAcceptedIfPending(
      offer._id,
      volunteer._id,
    );

    if (!acceptedOffer) {
      throw this.createServiceError(
        "This volunteer offer was already updated or expired",
        409,
      );
    }

    let workloadClaimed = false;
    let assignment = null;

    try {
      const updatedVolunteer = await volunteerRepository.claimWorkloadSlot(
        volunteer._id,
        ngoId,
      );

      if (!updatedVolunteer) {
        await volunteerOfferRepository.cancelOfferIfAccepted(
          offer._id,
          volunteer._id,
        );

        throw this.createServiceError(
          "You are no longer available for this assignment",
          409,
        );
      }

      workloadClaimed = true;

      assignment = await assignmentRepository.create({
        complaintId: offer.complaintId,
        volunteerOfferId: offer._id,
        volunteerId: volunteer._id,
        ngoId,
        assignedBy: userId,
        status: "assigned",
        notes: "Volunteer accepted the assignment offer.",
        acceptedAt: new Date(),
        progressUpdates: [
          {
            status: "assigned",
            message: "Volunteer accepted the assignment offer.",
          },
        ],
      });

      const updatedComplaint = await complaintRepository.assignOneVolunteer(
        offer.complaintId,
        ngoId,
      );

      if (!updatedComplaint) {
        await assignmentRepository.deleteById(assignment._id);

        await volunteerRepository.releaseWorkloadSlot(volunteer._id, ngoId);

        workloadClaimed = false;

        await volunteerOfferRepository.cancelOfferIfAccepted(
          offer._id,
          volunteer._id,
        );

        throw this.createServiceError(
          "The required volunteer count has already been reached",
          409,
        );
      }

      if (updatedComplaint.status === "FULLY_ASSIGNED") {
        await volunteerOfferRepository.cancelOtherPendingOffers(
          updatedComplaint._id,
          offer._id,
        );
      } else {
        // I am keeping enough pending offers available for the remaining slots.
        await volunteerMatchingService.dispatchAdditionalOffersForComplaint(
          updatedComplaint,
          "VOLUNTEER_ACCEPTED",
        );
      }

      console.log(
        `✅ Volunteer ${volunteer._id} accepted complaint ${updatedComplaint.complaintId}`,
      );

      return {
        offer: acceptedOffer,
        assignment,
        complaint: updatedComplaint,
        replacementOffersCreated: 0,
        message:
          updatedComplaint.status === "FULLY_ASSIGNED"
            ? "Offer accepted. The full volunteer team is now assigned."
            : "Offer accepted. Your assignment was created successfully.",
      };
    } catch (error) {
      if (assignment) {
        await assignmentRepository.deleteById(assignment._id);
      }

      if (workloadClaimed) {
        await volunteerRepository.releaseWorkloadSlot(volunteer._id, ngoId);
      }

      await volunteerOfferRepository.cancelOfferIfAccepted(
        offer._id,
        volunteer._id,
      );

      throw error;
    }
  }
}

export default new VolunteerOfferService();
