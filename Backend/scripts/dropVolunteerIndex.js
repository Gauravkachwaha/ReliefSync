import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";

dotenv.config();

const dropIndex = async () => {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collections = await db.listCollections({ name: "volunteers" }).toArray();
    if (collections.length > 0) {
      console.log("Found volunteers collection. Dropping index 'userId_1'...");
      try {
        await db.collection("volunteers").dropIndex("userId_1");
        console.log("✅ Index 'userId_1' dropped successfully.");
      } catch (err) {
        if (err.codeName === "IndexNotFound" || err.message.includes("index not found")) {
          console.log("ℹ️ Index 'userId_1' was not found (already dropped).");
        } else {
          throw err;
        }
      }
    } else {
      console.log("ℹ️ volunteers collection does not exist yet.");
    }
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to drop index:", error.message);
    process.exit(1);
  }
};

dropIndex();
