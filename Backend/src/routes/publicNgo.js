import express from "express";
import NGO from "../models/NGO.js";
import Complaint from "../models/Complaint.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const ngos = await NGO.find({ verificationStatus: "VERIFIED" })
      .select(
        "name email phone supportedCategories serviceAreas responseSlaMinutes impactScore impactBadges createdAt"
      )
      .lean();

    const publicNgos = await Promise.all(
      ngos.map(async (ngo) => {
        const resolvedCasesCount = await Complaint.countDocuments({
          acceptedNgoId: ngo._id,
          status: "RESOLVED",
        });

        return {
          ...ngo,
          resolvedCasesCount,
        };
      })
    );

    res.json({
      success: true,
      data: publicNgos,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
