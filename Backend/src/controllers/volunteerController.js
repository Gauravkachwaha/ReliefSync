import volunteerService from "../services/volunteerService.js";

const requireNgoAdmin = (req, res) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Only an NGO admin can manage volunteer profiles",
    });

    return false;
  }

  return true;
};

const createVolunteer = async (req, res, next) => {
  try {
    if (!requireNgoAdmin(req, res)) {
      return;
    }

    const volunteer = await volunteerService.createVolunteer(
      req.body || {},
      req.user.ngoId,
    );

    res.status(201).json({
      success: true,
      message: "Volunteer created successfully",
      data: volunteer,
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

const createVolunteerLoginAccount = async (req, res, next) => {
  try {
    if (!requireNgoAdmin(req, res)) {
      return;
    }

    const result = await volunteerService.createVolunteerLoginAccount(
      req.params.id,
      req.user.ngoId,
      req.body?.password,
    );

    res.status(201).json({
      success: true,
      message: "Volunteer login account created successfully",
      data: {
        volunteer: result.volunteer,
        user: result.user,
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

const getAllVolunteers = async (req, res, next) => {
  try {
    if (req.user.role === "volunteer") {
      return res.status(403).json({
        success: false,
        message: "Volunteers can view only their own profile",
      });
    }

    const volunteers = await volunteerService.getAllVolunteers(req.user.ngoId);

    res.json({
      success: true,
      count: volunteers.length,
      data: volunteers,
    });
  } catch (error) {
    next(error);
  }
};

const getMyVolunteerProfile = async (req, res, next) => {
  try {
    if (req.user.role !== "volunteer") {
      return res.status(403).json({
        success: false,
        message: "Volunteer access is required",
      });
    }

    const volunteer = await volunteerService.getVolunteerByUserId(
      req.user.id,
      req.user.ngoId,
    );

    res.json({
      success: true,
      data: volunteer,
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

const updateMyAvailability = async (req, res, next) => {
  try {
    if (req.user.role !== "volunteer") {
      return res.status(403).json({
        success: false,
        message: "Volunteer access is required",
      });
    }

    const volunteer = await volunteerService.updateMyAvailability(
      req.user.id,
      req.user.ngoId,
      req.body?.availability,
    );

    res.json({
      success: true,
      message: "Availability updated successfully",
      data: volunteer,
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

const getVolunteerById = async (req, res, next) => {
  try {
    // Volunteers can only access their own profile
    if (req.user.role === "volunteer") {
      const ownVolunteer = await volunteerService.getVolunteerByUserId(
        req.user.id,
        req.user.ngoId,
      );

      if (String(ownVolunteer._id) !== req.params.id) {
        return res.status(403).json({
          success: false,
          message: "Volunteers can view only their own profile",
        });
      }

      return res.json({
        success: true,
        data: ownVolunteer,
      });
    }

    // Admins can access any volunteer in their NGO
    const volunteer = await volunteerService.getVolunteerById(
      req.params.id,
      req.user.ngoId,
    );

    res.json({
      success: true,
      data: volunteer,
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

const updateVolunteer = async (req, res, next) => {
  try {
    if (!requireNgoAdmin(req, res)) {
      return;
    }

    const volunteer = await volunteerService.updateVolunteer(
      req.params.id,
      req.user.ngoId,
      req.body || {},
    );

    res.json({
      success: true,
      message: "Volunteer updated successfully",
      data: volunteer,
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

export {
  createVolunteer,
  createVolunteerLoginAccount,
  getAllVolunteers,
  getMyVolunteerProfile,
  getVolunteerById,
  updateMyAvailability,
  updateVolunteer,
};
