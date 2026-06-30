import Volunteer from "../models/Volunteer.js";

class VolunteerRepository {
  async create(volunteerData) {
    return await Volunteer.create(volunteerData);
  }

  async findByNgoId(ngoId) {
    return await Volunteer.find({
      ngoId,
      isActive: true,
    }).sort({
      createdAt: -1,
    });
  }

  async findById(id, ngoId) {
    return await Volunteer.findOne({
      _id: id,
      ngoId,
      isActive: true,
    });
  }

  async findByEmail(email) {
    return await Volunteer.findOne({
      email: String(email).toLowerCase(),
    });
  }

  async findByUserId(userId, ngoId) {
    return await Volunteer.findOne({
      userId,
      ngoId,
      isActive: true,
    });
  }

  async findEligibleForMatching(ngoId) {
    return await Volunteer.find({
      ngoId,
      isActive: true,
      verificationStatus: "VERIFIED",
      availability: "available",
      userId: { $ne: null },
      $expr: {
        $lt: ["$currentActiveAssignments", "$maxActiveAssignments"],
      },
    });
  }

  async claimWorkloadSlot(id, ngoId) {
    return await Volunteer.findOneAndUpdate(
      {
        _id: id,
        ngoId,
        isActive: true,
        verificationStatus: "VERIFIED",
        availability: "available",
        $expr: {
          $lt: ["$currentActiveAssignments", "$maxActiveAssignments"],
        },
      },
      [
        {
          $set: {
            currentActiveAssignments: {
              $add: ["$currentActiveAssignments", 1],
            },
          },
        },
        {
          $set: {
            availability: {
              $cond: [
                {
                  $gte: ["$currentActiveAssignments", "$maxActiveAssignments"],
                },
                "on_assignment",
                "available",
              ],
            },
          },
        },
      ],
      {
        new: true,
      },
    );
  }

  // This releases exactly one workload slot after completion.
  // Offline or busy volunteers remain offline/busy.
  async releaseWorkloadSlot(id, ngoId) {
    return await Volunteer.findOneAndUpdate(
      {
        _id: id,
        ngoId,
        currentActiveAssignments: { $gt: 0 },
      },
      [
        {
          $set: {
            currentActiveAssignments: {
              $max: [
                0,
                {
                  $subtract: [
                    {
                      $ifNull: ["$currentActiveAssignments", 0],
                    },
                    1,
                  ],
                },
              ],
            },
          },
        },
        {
          $set: {
            availability: {
              $cond: [
                {
                  $in: ["$availability", ["offline", "busy"]],
                },
                "$availability",
                {
                  $cond: [
                    {
                      $gte: [
                        "$currentActiveAssignments",
                        "$maxActiveAssignments",
                      ],
                    },
                    "on_assignment",
                    "available",
                  ],
                },
              ],
            },
          },
        },
      ],
      {
        new: true,
      },
    );
  }

  async update(id, ngoId, updateData) {
    return await Volunteer.findOneAndUpdate(
      {
        _id: id,
        ngoId,
        isActive: true,
      },
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );
  }
}

export default new VolunteerRepository();
