import express from "express";
import protect from "../middlewares/authMiddleware.js";
import requireSuperAdmin from "../middlewares/superAdminMiddleware.js";
import {
  getNgoVerificationQueue,
  updateNgoVerification,
} from "../controllers/superAdminController.js";

const router = express.Router();

router.use(protect);
router.use(requireSuperAdmin);

router.get("/ngos", getNgoVerificationQueue);

router.patch("/ngos/:ngoId/verification", updateNgoVerification);

export default router;
