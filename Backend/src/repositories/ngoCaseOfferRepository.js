import NgoCaseOffer from "../models/NgoCaseOffer.js";

class NgoCaseOfferRepository {
  async create(offerData) {
    return await NgoCaseOffer.create(offerData);
  }

  async findByComplaintId(complaintId) {
    return await NgoCaseOffer.find({ complaintId }).sort({
      matchScore: -1,
      createdAt: 1,
    });
  }

  async findByNgoIdAndStatus(ngoId, status) {
    return await NgoCaseOffer.find({
      ngoId,
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
        matchScore: -1,
        createdAt: -1,
      });
  }

  async findByIdAndNgoId(offerId, ngoId) {
    return await NgoCaseOffer.findOne({
      _id: offerId,
      ngoId,
    });
  }

  async markAcceptedIfPending(offerId, ngoId) {
    return await NgoCaseOffer.findOneAndUpdate(
      {
        _id: offerId,
        ngoId,
        status: "PENDING",
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

  async markRejectedIfPending(offerId, ngoId) {
    return await NgoCaseOffer.findOneAndUpdate(
      {
        _id: offerId,
        ngoId,
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

  async markExpiredIfPending(offerId, ngoId) {
    return await NgoCaseOffer.findOneAndUpdate(
      {
        _id: offerId,
        ngoId,
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
        runValidators: true,
      },
    );
  }

  // Used when another NGO wins the atomic complaint claim.
  async cancelOfferIfAccepted(offerId, ngoId) {
    return await NgoCaseOffer.findOneAndUpdate(
      {
        _id: offerId,
        ngoId,
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

  // Once one NGO accepts, all other open offers must stop.
  async cancelOtherOpenOffers(complaintId, acceptedOfferId) {
    return await NgoCaseOffer.updateMany(
      {
        complaintId,
        _id: { $ne: acceptedOfferId },
        status: { $in: ["PENDING", "ACCEPTED"] },
      },
      {
        $set: {
          status: "CANCELLED",
          respondedAt: new Date(),
        },
      },
    );
  }

  async expirePendingOffersForNgoId(ngoId) {
    return await NgoCaseOffer.updateMany(
      {
        ngoId,
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
}

export default new NgoCaseOfferRepository();
