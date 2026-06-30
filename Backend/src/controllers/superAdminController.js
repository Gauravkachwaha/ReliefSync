import ngoRepository from "../repositories/ngoRepository.js";

const allowedVerificationStatuses = ["PENDING", "VERIFIED", "REJECTED"];

const getNgoVerificationQueue = async (req, res, next) => {
  try {
    const requestedStatus = String(req.query.status || "PENDING").toUpperCase();

    if (!allowedVerificationStatuses.includes(requestedStatus)) {
      return res.status(400).json({
        success: false,
        message: "status must be PENDING, VERIFIED, or REJECTED",
      });
    }

    const ngos = await ngoRepository.findByVerificationStatus(requestedStatus);

    res.json({
      success: true,
      count: ngos.length,
      data: ngos,
    });
  } catch (error) {
    next(error);
  }
};

const updateNgoVerification = async (req, res, next) => {
  try {
    const { ngoId } = req.params;
    const { verificationStatus } = req.body || {};

    const normalizedStatus = String(verificationStatus || "").toUpperCase();

    // Super Admin can only approve or reject from this endpoint.
    if (!["VERIFIED", "REJECTED"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "verificationStatus must be VERIFIED or REJECTED",
      });
    }

    const ngo = await ngoRepository.updateById(ngoId, {
      verificationStatus: normalizedStatus,
    });

    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: "NGO not found",
      });
    }

    res.json({
      success: true,
      message: `NGO marked as ${normalizedStatus}`,
      data: ngo,
    });
  } catch (error) {
    next(error);
  }
};

export { getNgoVerificationQueue, updateNgoVerification };
