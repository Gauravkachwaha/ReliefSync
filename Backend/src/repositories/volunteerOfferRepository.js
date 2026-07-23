import VolunteerOffer from "../models/VolunteerOffer.js";

class VolunteerOfferRepository {
  async create(offerData) {
    return await VolunteerOffer.create(offerData);
  }

  async findByComplaintId(complaintId) {
    return await VolunteerOffer.find({ complaintId }).sort({
      matchScore: -1,
      createdAt: 1,
    });
  }

  async findByNgoIdAndStatus(ngoId, status) {
    return await VolunteerOffer.find({
      ngoId,
      status,
    })
      .populate({
        path: "volunteerId",
        select: [
          "name",
          "email",
          "skills",
          "location",
          "preferredAreas",
          "availability",
          "reliabilityScore",
        ].join(" "),
      })
      .populate({
        path: "complaintId",
        select: [
          "complaintId",
          "originalText",
          "locationHint",
          "category",
          "severity",
          "requiredPeople",
          "requiredSkills",
          "status",
          "createdAt",
        ].join(" "),
      })
      .sort({
        matchScore: -1,
        createdAt: -1,
      });
  }

  async findByVolunteerIdAndStatus(volunteerId, status) {
    return await VolunteerOffer.find({
      volunteerId,
      status,
    })
      .populate({
        path: "complaintId",
        select: [
          "complaintId",
          "originalText",
          "locationHint",
          "category",
          "severity",
          "requiredPeople",
          "requiredSkills",
          "status",
          "createdAt",
        ].join(" "),
      })
      .sort({
        expiresAt: 1,
        createdAt: -1,
      });
  }

  async findByIdAndVolunteerId(offerId, volunteerId) {
    return await VolunteerOffer.findOne({
      _id: offerId,
      volunteerId,
    });
  }

  async findExpiredPendingByVolunteerId(volunteerId) {
    return await VolunteerOffer.find({
      volunteerId,
      status: "PENDING",
      expiresAt: { $lte: new Date() },
    });
  }

  async expirePendingOffersForComplaint(complaintId) {
    return await VolunteerOffer.updateMany(
      {
        complaintId,
        status: "PENDING",
        expiresAt: { $lte: new Date() },
      },
      {
        $set: {
          status: "EXPIRED",
          respondedAt: new Date(),
        },
      },
    );
  }

  async markAcceptedIfPending(offerId, volunteerId) {
    return await VolunteerOffer.findOneAndUpdate(
      {
        _id: offerId,
        volunteerId,
        status: "PENDING",
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          status: "ACCEPTED",
          respondedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  async markRejectedIfPending(offerId, volunteerId) {
    return await VolunteerOffer.findOneAndUpdate(
      {
        _id: offerId,
        volunteerId,
        status: "PENDING",
      },
      {
        $set: {
          status: "REJECTED",
          respondedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  async markExpiredIfPending(offerId, volunteerId) {
    return await VolunteerOffer.findOneAndUpdate(
      {
        _id: offerId,
        volunteerId,
        status: "PENDING",
      },
      {
        $set: {
          status: "EXPIRED",
          respondedAt: new Date(),
        },
      },
      {
        new: true,
      },
    );
  }

  async cancelOfferIfAccepted(offerId, volunteerId) {
    return await VolunteerOffer.findOneAndUpdate(
      {
        _id: offerId,
        volunteerId,
        status: "ACCEPTED",
      },
      {
        $set: {
          status: "CANCELLED",
          respondedAt: new Date(),
        },
      },
      {
        new: true,
      },
    );
  }

  async cancelOtherPendingOffers(complaintId, acceptedOfferId) {
    return await VolunteerOffer.updateMany(
      {
        complaintId,
        _id: { $ne: acceptedOfferId },
        status: "PENDING",
      },
      {
        $set: {
          status: "CANCELLED",
          respondedAt: new Date(),
        },
      },
    );
  }
}

export default new VolunteerOfferRepository();
