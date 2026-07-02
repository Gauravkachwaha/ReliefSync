import dotenv from "dotenv";
import mongoose from "mongoose";
import NGO from "../src/models/NGO.js";
import connectDB from "../src/config/db.js";

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    const res = await NGO.updateMany(
      { verificationStatus: { $ne: "VERIFIED" } },
      { $set: { verificationStatus: "VERIFIED" } }
    );
    console.log(`✅ Successfully verified ${res.modifiedCount} existing NGOs!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Verification script failed:", error.message);
    process.exit(1);
  }
};

run();
