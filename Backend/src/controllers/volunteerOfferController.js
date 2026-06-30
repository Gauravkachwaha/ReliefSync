import volunteerMatchingService from "../services/volunteerMatchingService.js";
import volunteerOfferService from "../services/volunteerOfferService.js";

const allowedOfferStatuses = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
];

const getNgoVolunteerOffers = async (req, res, next) => {
  try {
    if (!["admin", "coordinator"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Only NGO admins or coordinators can view NGO volunteer offers",
      });
    }

    const status = String(req.query.status || "PENDING").toUpperCase();

    if (!allowedOfferStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "status must be PENDING, ACCEPTED, REJECTED, EXPIRED, or CANCELLED",
      });
    }

    const offers = await volunteerMatchingService.getVolunteerOffersForNgo(
      req.user.ngoId,
      status,
    );

    res.json({
      success: true,
      count: offers.length,
      data: offers,
    });
  } catch (error) {
    next(error);
  }
};

const getMyVolunteerOffers = async (req, res, next) => {
  try {
    if (req.user.role !== "volunteer") {
      return res.status(403).json({
        success: false,
        message: "Volunteer access is required",
      });
    }

    const status = String(req.query.status || "PENDING").toUpperCase();

    if (!allowedOfferStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "status must be PENDING, ACCEPTED, REJECTED, EXPIRED, or CANCELLED",
      });
    }

    const offers = await volunteerOfferService.getMyOffers(
      req.user.id,
      req.user.ngoId,
      status,
    );

    res.json({
      success: true,
      count: offers.length,
      data: offers,
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

const respondToVolunteerOffer = async (req, res, next) => {
  try {
    if (req.user.role !== "volunteer") {
      return res.status(403).json({
        success: false,
        message: "Volunteer access is required",
      });
    }

    const result = await volunteerOfferService.respondToOffer({
      offerId: req.params.offerId,
      userId: req.user.id,
      ngoId: req.user.ngoId,
      decision: req.body?.decision,
    });

    res.json({
      success: true,
      message: result.message,
      data: {
        offer: result.offer,
        assignment: result.assignment,
        complaint: result.complaint
          ? {
              complaintId: result.complaint.complaintId,
              status: result.complaint.status,
              requiredPeople: result.complaint.requiredPeople,
              assignedPeopleCount: result.complaint.assignedPeopleCount,
            }
          : null,
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

export { getNgoVolunteerOffers, getMyVolunteerOffers, respondToVolunteerOffer };
