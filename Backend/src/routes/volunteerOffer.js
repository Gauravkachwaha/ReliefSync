import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { requireNgoMembership } from "../middlewares/authorizationMiddleware.js";
import {
  getMyVolunteerOffers,
  getNgoVolunteerOffers,
  respondToVolunteerOffer,
} from "../controllers/volunteerOfferController.js";

const router = express.Router();

router.use(protect);
router.use(requireNgoMembership);

// Keep these above /:offerId/respond.
router.get("/ngo", getNgoVolunteerOffers);

router.get("/me", getMyVolunteerOffers);

router.patch("/:offerId/respond", respondToVolunteerOffer);

export default router;
