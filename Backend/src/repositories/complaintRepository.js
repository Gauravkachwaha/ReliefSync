import Complaint from "../models/Complaint.js";

class ComplaintRepository {
  async create(complaintData) {
    return await Complaint.create(complaintData);
  }

  async findById(id) {
    return await Complaint.findById(id);
  }

  async findByComplaintId(complaintId) {
    return await Complaint.findOne({ complaintId });
  }

  async findByComplaintIdWithTrackingHash(complaintId) {
    return await Complaint.findOne({ complaintId }).select(
      "+guestTrackingTokenHash",
    );
  }

  async findRecentByContentFingerprint(contentFingerprint, sinceDate) {
    return await Complaint.findOne({
      contentFingerprint,
      createdAt: { $gte: sinceDate },
      status: {
        $nin: ["BLOCKED", "REJECTED_AS_SPAM", "CANCELLED"],
      },
    }).sort({ createdAt: -1 });
  }

  async findRecentSemanticCandidates(sinceDate, maxCandidates = 150) {
    return await Complaint.find({
      createdAt: { $gte: sinceDate },
      semanticEmbedding: {
        $exists: true,
        $ne: [],
      },
      status: {
        $nin: ["BLOCKED", "REJECTED_AS_SPAM", "CANCELLED", "DUPLICATE"],
      },
    })
      .select(
        [
          "complaintId",
          "originalText",
          "locationHint",
          "semanticEmbeddingModelName",
          "+semanticEmbedding",
        ].join(" "),
      )
      .sort({
        createdAt: -1,
      })
      .limit(maxCandidates);
  }

  async updateById(id, updateData) {
    return await Complaint.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  }

  async countActiveAcceptedCasesByNgoId(ngoId) {
    return await Complaint.countDocuments({
      acceptedNgoId: ngoId,
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
  }

  async claimComplaintForNgo(complaintId, ngoId) {
    return await Complaint.findOneAndUpdate(
      {
        _id: complaintId,
        status: "NGOS_NOTIFIED",
        acceptedNgoId: null,
      },
      {
        $set: {
          acceptedNgoId: ngoId,
          status: "NGO_ACCEPTED",
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  async assignOneVolunteer(complaintId, ngoId) {
    return await Complaint.findOneAndUpdate(
      {
        _id: complaintId,
        acceptedNgoId: ngoId,
        status: {
          $in: [
            "NGO_ACCEPTED",
            "VOLUNTEER_MATCHING",
            "PARTIALLY_ASSIGNED",
            "IN_PROGRESS",
          ],
        },
        $expr: {
          $lt: ["$assignedPeopleCount", "$requiredPeople"],
        },
      },
      [
        {
          $set: {
            assignedPeopleCount: {
              $add: ["$assignedPeopleCount", 1],
            },
          },
        },
        {
          $set: {
            updatedAt: "$$NOW",
            status: {
              $cond: [
                {
                  $gte: ["$assignedPeopleCount", "$requiredPeople"],
                },
                "FULLY_ASSIGNED",
                {
                  $cond: [
                    { $eq: ["$status", "IN_PROGRESS"] },
                    "IN_PROGRESS",
                    "PARTIALLY_ASSIGNED",
                  ],
                },
              ],
            },
          },
        },
      ],
      {
        new: true,
        timestamps: false, // We set updatedAt manually in the pipeline above
        updatePipeline: true,
      },
    );
  }

  async markInProgress(complaintId, ngoId) {
    return await Complaint.findOneAndUpdate(
      {
        _id: complaintId,
        acceptedNgoId: ngoId,
        status: {
          $in: [
            "NGO_ACCEPTED",
            "VOLUNTEER_MATCHING",
            "PARTIALLY_ASSIGNED",
            "FULLY_ASSIGNED",
            "IN_PROGRESS",
          ],
        },
      },
      {
        $set: {
          status: "IN_PROGRESS",
        },
      },
      {
        new: true,
      },
    );
  }

  async markResolvedIfReady(complaintId, ngoId) {
    return await Complaint.findOneAndUpdate(
      {
        _id: complaintId,
        acceptedNgoId: ngoId,
        status: {
          $in: ["PARTIALLY_ASSIGNED", "FULLY_ASSIGNED", "IN_PROGRESS"],
        },
        $expr: {
          $gte: ["$assignedPeopleCount", "$requiredPeople"],
        },
      },
      {
        $set: {
          status: "RESOLVED",
        },
      },
      {
        new: true,
      },
    );
  }
}

export default new ComplaintRepository();
