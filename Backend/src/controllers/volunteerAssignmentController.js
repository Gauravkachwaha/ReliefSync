import volunteerAssignmentService from "../services/volunteerAssignmentService.js";

const getMyAssignments = async (req, res, next) => {
  try {
    if (req.user.role !== "volunteer") {
      return res.status(403).json({
        success: false,
        message: "Volunteer access is required",
      });
    }

    const assignments = await volunteerAssignmentService.getMyAssignments(
      req.user.id,
      req.user.ngoId,
      req.query.status,
    );

    res.json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

const updateMyAssignmentProgress = async (req, res, next) => {
  try {
    if (req.user.role !== "volunteer") {
      return res.status(403).json({
        success: false,
        message: "Volunteer access is required",
      });
    }

    const result = await volunteerAssignmentService.updateMyAssignmentProgress({
      assignmentId: req.params.assignmentId,
      userId: req.user.id,
      ngoId: req.user.ngoId,
      status: req.body?.status,
      message: req.body?.message,
    });

    res.json({
      success: true,
      message: result.complaintResolved
        ? "Assignment completed and the complaint is now resolved."
        : "Assignment progress updated successfully.",
      data: {
        assignment: result.assignment,
        complaint: result.complaint
          ? {
              complaintId: result.complaint.complaintId,
              status: result.complaint.status,
              requiredPeople: result.complaint.requiredPeople,
              assignedPeopleCount: result.complaint.assignedPeopleCount,
            }
          : null,
        workloadReleased: result.workloadReleased,
        complaintResolved: result.complaintResolved,
      },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

export { getMyAssignments, updateMyAssignmentProgress };
