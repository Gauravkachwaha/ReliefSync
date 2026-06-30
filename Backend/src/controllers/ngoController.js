import ngoRepository from "../repositories/ngoRepository.js";
import ngoCaseOfferService from "../services/ngoCaseOfferService.js";

const allowedCategories = [
  "MEDICAL_SUPPORT",
  "FOOD_RELIEF",
  "SHELTER_SUPPORT",
  "DISASTER_RELIEF",
  "WOMEN_CHILD_SAFETY",
  "CIVIC_GRIEVANCE",
  "GENERAL_SUPPORT",
];

const allowedOfferStatuses = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
];

const normalizeCategoryList = (categories) => {
  if (!Array.isArray(categories) || categories.length > 20) {
    const error = new Error(
      "supportedCategories must be an array with at most 20 values",
    );

    error.status = 400;
    throw error;
  }

  const normalizedCategories = [
    ...new Set(
      categories
        .map((category) => String(category).trim().toUpperCase())
        .filter(Boolean),
    ),
  ];

  const invalidCategory = normalizedCategories.find(
    (category) => !allowedCategories.includes(category),
  );

  if (invalidCategory) {
    const error = new Error(`Unsupported category: ${invalidCategory}`);
    error.status = 400;
    throw error;
  }

  return normalizedCategories;
};

const normalizeServiceAreas = (areas) => {
  if (!Array.isArray(areas) || areas.length > 30) {
    const error = new Error(
      "serviceAreas must be an array with at most 30 values",
    );

    error.status = 400;
    throw error;
  }

  const normalizedAreas = [
    ...new Set(areas.map((area) => String(area).trim()).filter(Boolean)),
  ];

  if (normalizedAreas.some((area) => area.length > 120)) {
    const error = new Error(
      "Each service area must contain at most 120 characters",
    );

    error.status = 400;
    throw error;
  }

  return normalizedAreas;
};

const getMyNgoProfile = async (req, res, next) => {
  try {
    const ngo = await ngoRepository.findById(req.user.ngoId);

    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: "NGO profile was not found",
      });
    }

    res.json({
      success: true,
      data: ngo,
    });
  } catch (error) {
    next(error);
  }
};

const updateMyNgoProfile = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only an NGO admin can update this profile",
      });
    }

    const {
      supportedCategories,
      serviceAreas,
      capacityConfig,
      responseSlaMinutes,
    } = req.body || {};

    const updateData = {};

    if (supportedCategories !== undefined) {
      updateData.supportedCategories =
        normalizeCategoryList(supportedCategories);
    }

    if (serviceAreas !== undefined) {
      updateData.serviceAreas = normalizeServiceAreas(serviceAreas);
    }

    if (capacityConfig !== undefined) {
      if (
        !capacityConfig ||
        typeof capacityConfig !== "object" ||
        Array.isArray(capacityConfig)
      ) {
        return res.status(400).json({
          success: false,
          message: "capacityConfig must be an object",
        });
      }

      if (capacityConfig.maxConcurrentCases !== undefined) {
        const maxConcurrentCases = Number(capacityConfig.maxConcurrentCases);

        if (
          !Number.isInteger(maxConcurrentCases) ||
          maxConcurrentCases < 1 ||
          maxConcurrentCases > 500
        ) {
          return res.status(400).json({
            success: false,
            message:
              "capacityConfig.maxConcurrentCases must be an integer from 1 to 500",
          });
        }

        updateData["capacityConfig.maxConcurrentCases"] = maxConcurrentCases;
      }

      if (capacityConfig.autoDispatchEnabled !== undefined) {
        if (typeof capacityConfig.autoDispatchEnabled !== "boolean") {
          return res.status(400).json({
            success: false,
            message: "capacityConfig.autoDispatchEnabled must be true or false",
          });
        }

        updateData["capacityConfig.autoDispatchEnabled"] =
          capacityConfig.autoDispatchEnabled;
      }
    }

    if (responseSlaMinutes !== undefined) {
      const responseSla = Number(responseSlaMinutes);

      if (
        !Number.isInteger(responseSla) ||
        responseSla < 5 ||
        responseSla > 1440
      ) {
        return res.status(400).json({
          success: false,
          message: "responseSlaMinutes must be an integer from 5 to 1440",
        });
      }

      updateData.responseSlaMinutes = responseSla;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one valid profile field to update",
      });
    }

    const ngo = await ngoRepository.updateById(req.user.ngoId, updateData);

    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: "NGO profile was not found",
      });
    }

    res.json({
      success: true,
      message: "NGO routing profile updated successfully",
      data: ngo,
    });
  } catch (error) {
    next(error);
  }
};

const getIncomingCaseOffers = async (req, res, next) => {
  try {
    const requestedStatus = String(req.query.status || "PENDING").toUpperCase();

    if (!allowedOfferStatuses.includes(requestedStatus)) {
      return res.status(400).json({
        success: false,
        message:
          "status must be PENDING, ACCEPTED, REJECTED, EXPIRED, or CANCELLED",
      });
    }

    const offers = await ngoCaseOfferService.getIncomingOffers(
      req.user.ngoId,
      requestedStatus,
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

const respondToCaseOffer = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only an NGO admin can accept or reject a case offer",
      });
    }

    const result = await ngoCaseOfferService.respondToOffer({
      offerId: req.params.offerId,
      ngoId: req.user.ngoId,
      decision: req.body?.decision,
    });

    res.json({
      success: true,
      message: result.message,
      data: {
        offer: result.offer,
        complaint: result.complaint
          ? {
              complaintId: result.complaint.complaintId,
              status: result.complaint.status,
              acceptedNgoId: result.complaint.acceptedNgoId,
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

export {
  getMyNgoProfile,
  updateMyNgoProfile,
  getIncomingCaseOffers,
  respondToCaseOffer,
};
