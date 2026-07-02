import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../src/config/db.js";
import NGO from "../src/models/NGO.js";
import User from "../src/models/User.js";
import Volunteer from "../src/models/Volunteer.js";

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    console.log("Creating seed data...");

    // 1. Create or Find NGO
    let ngo = await NGO.findOne({ email: "redcross@reliefsync.local" });
    if (!ngo) {
      ngo = await NGO.create({
        name: "Red Cross Delhi",
        email: "redcross@reliefsync.local",
        phone: "9876543210",
        address: "New Delhi, India",
        supportedCategories: ["MEDICAL_SUPPORT", "FOOD_RELIEF", "SHELTER_SUPPORT", "DISASTER_RELIEF", "GENERAL_SUPPORT"],
        serviceAreas: ["Delhi", "Noida", "Gurugram"],
        capacityConfig: { maxConcurrentCases: 15, autoDispatchEnabled: true },
        responseSlaMinutes: 60,
        verificationStatus: "VERIFIED",
      });
      console.log("✅ Demo NGO created");
    } else {
      console.log("ℹ️ Demo NGO already exists");
    }

    // 2. Create NGO Admin User
    let adminUser = await User.findOne({ email: "ngo@reliefsync.local" });
    if (!adminUser) {
      const hashedAdminPassword = await bcrypt.hash("ngo12345", 10);
      adminUser = await User.create({
        name: "NGO Coordinator",
        email: "ngo@reliefsync.local",
        password: hashedAdminPassword,
        role: "admin",
        ngoId: ngo._id,
        isActive: true,
      });
      console.log("✅ Demo NGO Admin created (Email: ngo@reliefsync.local / Pass: ngo12345)");
    } else {
      console.log("ℹ️ Demo NGO Admin already exists");
    }

    // 3. Create Volunteer Profile
    let volunteer = await Volunteer.findOne({ email: "volunteer@reliefsync.local" });
    if (!volunteer) {
      volunteer = await Volunteer.create({
        name: "John Doe",
        email: "volunteer@reliefsync.local",
        phone: "9112233445",
        location: "Delhi",
        skills: ["First Aid", "Search & Rescue", "Food Distribution"],
        preferredAreas: ["Delhi", "Noida"],
        availability: "available",
        maxActiveAssignments: 3,
        currentActiveAssignments: 0,
        reliabilityScore: 85,
        verificationStatus: "VERIFIED",
        ngoId: ngo._id,
        isActive: true,
      });
      console.log("✅ Demo Volunteer Profile created");
    } else {
      console.log("ℹ️ Demo Volunteer Profile already exists");
    }

    // 4. Create Volunteer User login
    let volunteerUser = await User.findOne({ email: "volunteer@reliefsync.local" });
    if (!volunteerUser) {
      const hashedVolPassword = await bcrypt.hash("volunteer12345", 10);
      volunteerUser = await User.create({
        name: "John Doe",
        email: "volunteer@reliefsync.local",
        password: hashedVolPassword,
        role: "volunteer",
        ngoId: ngo._id,
        isActive: true,
      });
      volunteer.userId = volunteerUser._id;
      await volunteer.save();
      console.log("✅ Demo Volunteer User created (Email: volunteer@reliefsync.local / Pass: volunteer12345)");
    } else {
      console.log("ℹ️ Demo Volunteer User already exists");
      if (!volunteer.userId) {
        volunteer.userId = volunteerUser._id;
        await volunteer.save();
        console.log("🔗 Linked existing user to volunteer profile");
      }
    }

    console.log("🎉 Seed execution completed!");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

run();
