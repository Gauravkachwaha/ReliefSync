import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import connectDB from "../src/config/db.js";
import User from "../src/models/User.js";

dotenv.config();

const createSuperAdmin = async () => {
  try {
    const name = process.env.SUPER_ADMIN_NAME;
    const email = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!name || !email || !password) {
      throw new Error(
        "SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD are required in Backend/.env",
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log(`ℹ️ Super Admin already exists: ${existingUser.email}`);

      await mongoose.connection.close();
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const superAdmin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "super_admin",
      ngoId: null,
      isActive: true,
    });

    console.log("✅ Super Admin created successfully");
    console.log(`Email: ${superAdmin.email}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Could not create Super Admin:", error.message);

    await mongoose.connection.close();
    process.exit(1);
  }
};

createSuperAdmin();
