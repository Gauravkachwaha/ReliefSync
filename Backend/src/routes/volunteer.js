import express from "express";
import protect from "../middlewares/authMiddleware.js";
import {
  createVolunteer,
  createVolunteerLoginAccount,
  getAllVolunteers,
  getMyVolunteerProfile,
  getVolunteerById,
  updateMyAvailability,
  updateVolunteer,
} from "../controllers/volunteerController.js";

const router = express.Router();

router.use(protect);

// Keep these above "/:id", otherwise "me" would be treated as an ID.
router.get("/me", getMyVolunteerProfile);
router.patch("/me/availability", updateMyAvailability);

router.post("/", createVolunteer);

router.post("/:id/account", createVolunteerLoginAccount);

router.get("/", getAllVolunteers);
router.get("/:id", getVolunteerById);
router.put("/:id", updateVolunteer);

export default router;
