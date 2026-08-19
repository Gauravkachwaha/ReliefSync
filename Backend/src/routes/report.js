import express from "express";
import multer from "multer";
import path from "path";
import {
  createTextReport,
  createPdfReport,
  getAllReports,
  getReportById,
} from "../controllers/reportController.js";
import protect from "../middlewares/authMiddleware.js";
import { requireNgoMembership, requireRole } from "../middlewares/authorizationMiddleware.js";

const router = express.Router();

// Multer setup for PDF upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/reports/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// All routes are protected
router.use(protect);
router.use(requireNgoMembership);
router.use(requireRole("admin", "coordinator"));

router.post("/text", createTextReport);
router.post("/pdf", upload.single("pdf"), createPdfReport);
router.get("/", getAllReports);
router.get("/:id", getReportById);

export default router;
