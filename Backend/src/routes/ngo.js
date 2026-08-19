import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { requireNgoMembership, requireRole } from "../middlewares/authorizationMiddleware.js";
import {
  getIncomingCaseOffers,
  getMyNgoProfile,
  respondToCaseOffer,
  updateMyNgoProfile,
} from "../controllers/ngoController.js";

const router = express.Router();

router.use(protect);
router.use(requireNgoMembership);
router.use(requireRole("admin", "coordinator"));

router.get("/me", getMyNgoProfile);

router.patch("/me", updateMyNgoProfile);

router.get("/case-offers", getIncomingCaseOffers);

router.patch("/case-offers/:offerId/respond", respondToCaseOffer);

export default router;
