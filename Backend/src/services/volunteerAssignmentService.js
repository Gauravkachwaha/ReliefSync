import assignmentRepository from "../repositories/assignmentRepository.js";
import complaintRepository from "../repositories/complaintRepository.js";
import volunteerRepository from "../repositories/volunteerRepository.js";

const allowedStatuses = [
  "assigned",
  "travelling",
  "in_progress",
  "completed",
  "cancelled",
];

const allowedTransitions = {
  assigned: ["travelling", "in_progress"],
  travelling: ["in_progress"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
};

class VolunteerAssignmentService {
  createServiceError(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  normalizeMessage(message) {
    if (message === undefined || message === null) {
      return "";
    }

    if (typeof message !== "string") {
      throw this.createServiceError("message must be text");
    }

    const cleanMessage = message.trim();

    if (cleanMessage.length > 500) {
      throw this.createServiceError("message cannot exceed 500 characters");
    }

    return cleanMessage;
  }

  getStatusesForFilter(status) {
    const normalizedStatus = String(status || "ACTIVE").toLowerCase();

    if (normalizedStatus === "active") {
      return ["assigned", "travelling", "in_progress"];
    }

    if (!allowedStatuses.includes(normalizedStatus)) {
      throw this.createServiceError(
        "status must be ACTIVE, assigned, travelling, in_progress, completed, or cancelled",
      );
    }

    return [normalizedStatus];
  }

  async getMyAssignments(userId, ngoId, status) {
    const volunteer = await volunteerRepository.findByUserId(userId, ngoId);

    if (!volunteer) {
      throw this.createServiceError(
        "Volunteer profile is not linked to this account",
        404,
      );
    }

    const statuses = this.getStatusesForFilter(status);

    return await assignmentRepository.findByVolunteerIdAndStatuses(
      volunteer._id,
      statuses,
    );
  }

  async updateMyAssignmentProgress({
    assignmentId,
    userId,
    ngoId,
    status,
    message,
  }) {
    const nextStatus = String(status || "").toLowerCase();

    if (!["travelling", "in_progress", "completed"].includes(nextStatus)) {
      throw this.createServiceError(
        "status must be travelling, in_progress, or completed",
      );
    }

    const cleanMessage = this.normalizeMessage(message);

    const volunteer = await volunteerRepository.findByUserId(userId, ngoId);

    if (!volunteer) {
      throw this.createServiceError(
        "Volunteer profile is not linked to this account",
        404,
      );
    }

    const assignment = await assignmentRepository.findByIdAndVolunteerId(
      assignmentId,
      volunteer._id,
      ngoId,
    );

    if (!assignment) {
      throw this.createServiceError(
        "Assignment was not found for this volunteer",
        404,
      );
    }

    const allowedNextStatuses = allowedTransitions[assignment.status] || [];

    if (!allowedNextStatuses.includes(nextStatus)) {
      throw this.createServiceError(
        `Cannot change assignment from ${assignment.status} to ${nextStatus}`,
        409,
      );
    }

    const updatedAssignment =
      await assignmentRepository.updateVolunteerProgress({
        assignmentId,
        volunteerId: volunteer._id,
        ngoId,
        currentStatus: assignment.status,
        nextStatus,
        message: cleanMessage,
      });

    if (!updatedAssignment) {
      throw this.createServiceError(
        "Assignment was updated by another request. Refresh and try again.",
        409,
      );
    }

    let complaint = null;
    let complaintResolved = false;
    let workloadReleased = false;

    if (updatedAssignment.complaintId) {
      if (nextStatus === "travelling" || nextStatus === "in_progress") {
        complaint = await complaintRepository.markInProgress(
          updatedAssignment.complaintId,
          ngoId,
        );
      }

      if (nextStatus === "completed") {
        const updatedVolunteer = await volunteerRepository.releaseWorkloadSlot(
          volunteer._id,
          ngoId,
        );

        workloadReleased = Boolean(updatedVolunteer);

        const latestComplaint = await complaintRepository.findById(
          updatedAssignment.complaintId,
        );

        const assignmentSummary =
          await assignmentRepository.getComplaintAssignmentSummary(
            updatedAssignment.complaintId,
          );

        const requiredPeople = Math.max(
          1,
          Number(latestComplaint?.requiredPeople) || 1,
        );

        const enoughVolunteersWereAssigned =
          Number(latestComplaint?.assignedPeopleCount || 0) >= requiredPeople;

        const fullTeamCompleted =
          assignmentSummary.completedAssignments >= requiredPeople &&
          assignmentSummary.activeAssignments === 0;

        if (enoughVolunteersWereAssigned && fullTeamCompleted) {
          complaint = await complaintRepository.markResolvedIfReady(
            updatedAssignment.complaintId,
            ngoId,
          );

          complaintResolved = Boolean(complaint);
        } else {
          complaint = await complaintRepository.markInProgress(
            updatedAssignment.complaintId,
            ngoId,
          );
        }
      }
    }

    return {
      assignment: updatedAssignment,
      complaint,
      workloadReleased,
      complaintResolved,
    };
  }
}

export default new VolunteerAssignmentService();
