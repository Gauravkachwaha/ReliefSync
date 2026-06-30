import mongoose from "mongoose";
import Assignment from "../models/Assignment.js";

class AssignmentRepository {
  async create(assignmentData) {
    return await Assignment.create(assignmentData);
  }

  async findByNgoId(ngoId) {
    return await Assignment.find({ ngoId })
      .populate("needId")
      .populate({
        path: "complaintId",
        select: [
          "complaintId",
          "locationHint",
          "category",
          "severity",
          "requiredPeople",
          "assignedPeopleCount",
          "status",
        ].join(" "),
      })
      .populate("volunteerId")
      .sort({ createdAt: -1 });
  }

  async findById(id, ngoId) {
    return await Assignment.findOne({ _id: id, ngoId })
      .populate("needId")
      .populate("complaintId")
      .populate("volunteerId");
  }

  async findByIdAndVolunteerId(assignmentId, volunteerId, ngoId) {
    return await Assignment.findOne({
      _id: assignmentId,
      volunteerId,
      ngoId,
    });
  }

  async findByVolunteerIdAndStatuses(volunteerId, statuses) {
    return await Assignment.find({
      volunteerId,
      status: { $in: statuses },
    })
      .populate({
        path: "complaintId",
        select: [
          "complaintId",
          "locationHint",
          "category",
          "severity",
          "requiredPeople",
          "requiredSkills",
          "assignedPeopleCount",
          "status",
          "aiExtractedData.summary",
        ].join(" "),
      })
      .sort({
        updatedAt: -1,
        createdAt: -1,
      });
  }

  async updateVolunteerProgress({
    assignmentId,
    volunteerId,
    ngoId,
    currentStatus,
    nextStatus,
    message,
  }) {
    const updateData = {
      status: nextStatus,
    };

    if (message) {
      updateData.notes = message;
    }

    if (["travelling", "in_progress"].includes(nextStatus)) {
      updateData.startedAt = new Date();
    }

    if (nextStatus === "completed") {
      updateData.completedAt = new Date();
    }

    return await Assignment.findOneAndUpdate(
      {
        _id: assignmentId,
        volunteerId,
        ngoId,
        status: currentStatus,
      },
      {
        $set: updateData,
        $push: {
          progressUpdates: {
            status: nextStatus,
            message: message || `Assignment status changed to ${nextStatus}`,
          },
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  async getComplaintAssignmentSummary(complaintId) {
    const complaintObjectId = new mongoose.Types.ObjectId(String(complaintId));

    const [summary] = await Assignment.aggregate([
      {
        $match: {
          complaintId: complaintObjectId,
        },
      },
      {
        $group: {
          _id: null,
          totalAssignments: {
            $sum: 1,
          },
          completedAssignments: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
          activeAssignments: {
            $sum: {
              $cond: [
                {
                  $in: ["$status", ["assigned", "travelling", "in_progress"]],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    return (
      summary || {
        totalAssignments: 0,
        completedAssignments: 0,
        activeAssignments: 0,
      }
    );
  }

  async deleteById(id) {
    return await Assignment.findByIdAndDelete(id);
  }

  async updateStatus(id, ngoId, status, notes = "") {
    return await Assignment.findOneAndUpdate(
      { _id: id, ngoId },
      { status, notes },
      { new: true },
    );
  }
}

export default new AssignmentRepository();
