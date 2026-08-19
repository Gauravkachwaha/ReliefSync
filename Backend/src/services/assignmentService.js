import assignmentRepository from "../repositories/assignmentRepository.js";
import volunteerRepository from "../repositories/volunteerRepository.js";
import emailService from "./emailService.js";

class AssignmentService {
  async createAssignment(needId, volunteerId, assignedBy, ngoId) {
    const data = {
      needId,
      volunteerId,
      ngoId,
      assignedBy,
      status: "assigned",
    };
    const assignment = await assignmentRepository.create(data);

    // Change volunteer to 'on_assignment'
    try {
      await volunteerRepository.update(volunteerId, ngoId, {
        availability: "on_assignment",
      });
    } catch (err) {
      console.error("Failed to update volunteer status:", err.message);
    }

    // Send email to volunteer
    try {
      const volunteer = await volunteerRepository.findById(volunteerId, ngoId);
      if (volunteer && volunteer.email) {
        await emailService.sendAssignmentAlert(
          volunteer.email,
          assignment.needId?.title || "New Task",
        );
      }
    } catch (err) {
      console.error("Failed to send assignment email:", err.message);
    }

    return assignment;
  }

  async updateAssignmentStatus(id, ngoId, status, notes = "") {
    // Completion must be confirmed by the volunteer themselves, via
    // PATCH /api/volunteer-assignments/:id/progress — never set directly by
    // the NGO. This keeps "is this task actually done" consistent with the
    // complaint-driven assignment flow, where the NGO has no such override.
    if (status === "completed") {
      const error = new Error(
        "An assignment can only be marked completed by the volunteer confirming their own progress, not by the NGO directly.",
      );
      error.status = 400;
      throw error;
    }

    const assignment = await assignmentRepository.updateStatus(
      id,
      ngoId,
      status,
      notes,
    );

    return assignment;
  }

  async getAllAssignments(ngoId) {
    return await assignmentRepository.findByNgoId(ngoId);
  }
}

export default new AssignmentService();
