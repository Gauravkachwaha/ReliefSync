import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import connectDB from "./src/config/db.js";
import errorMiddleware from "./src/middlewares/errorMiddleware.js";

// Load environment variables FIRST
dotenv.config();

const app = express();

// This lets rate limiting see the original user IP after deployment behind a proxy.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// CORS: local dev + production frontends (comma-separated FRONTEND_URL in .env)
const defaultOrigins = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"];

const extraOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...extraOrigins])];

// Global middleware
app.use(helmet());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/health", (await import("./src/routes/health.js")).default);
app.use("/api/auth", (await import("./src/routes/auth.js")).default);

app.use(
  "/api/super-admin",
  (await import("./src/routes/superAdmin.js")).default,
);

app.use("/api/ngo", (await import("./src/routes/ngo.js")).default);

// This route is public. It does not need a login or JWT.
app.use(
  "/api/public/complaints",
  (await import("./src/routes/publicComplaint.js")).default,
);

app.use(
  "/api/public/ngos",
  (await import("./src/routes/publicNgo.js")).default,
);

app.use("/api/volunteers", (await import("./src/routes/volunteer.js")).default);
app.use(
  "/api/volunteer-offers",
  (await import("./src/routes/volunteerOffer.js")).default,
);
app.use(
  "/api/volunteer-assignments",
  (await import("./src/routes/volunteerAssignment.js")).default,
);

app.use("/api/reports", (await import("./src/routes/report.js")).default);
app.use("/api/needs", (await import("./src/routes/need.js")).default);

app.use("/api/matching", (await import("./src/routes/matching.js")).default);

app.use(
  "/api/assignments",
  (await import("./src/routes/assignment.js")).default,
);

app.use("/api/summaries", (await import("./src/routes/summary.js")).default);

app.use("/api/dashboard", (await import("./src/routes/dashboard.js")).default);

// Error middleware must stay last.
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `🚀 ReliefSync AI Backend running on http://localhost:${PORT}`,
      );
    });
  } catch (error) {
    console.error("❌ Server failed to start:", error.message);
    process.exit(1);
  }
};

startServer();
