import express from "express";
import rateLimit from "express-rate-limit";
import { registerNgo, login, refresh, logout } from "../controllers/authController.js";

const router = express.Router();

const authenticationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});

router.post("/register-ngo", authenticationLimiter, registerNgo);
router.post("/login", authenticationLimiter, login);
router.post("/refresh", authenticationLimiter, refresh);
router.post("/logout", logout);

export default router;
