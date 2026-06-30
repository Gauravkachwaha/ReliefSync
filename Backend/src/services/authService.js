import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import userRepository from "../repositories/userRepository.js";
import ngoRepository from "../repositories/ngoRepository.js";

const JWT_SECRET = process.env.JWT_SECRET;

class AuthService {
  createToken(user) {
    const payload = {
      id: user._id,
      role: user.role,
    };

    // Super Admin has no NGO. Admin, coordinator, and volunteer do.
    if (user.role !== "super_admin" && user.ngoId) {
      payload.ngoId = user.ngoId._id || user.ngoId;
    }

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: "7d",
    });
  }

  async registerNgo(ngoData, adminData) {
    const existingNgo = await ngoRepository.findByEmail(ngoData.email);

    if (existingNgo) {
      throw new Error("NGO with this email already exists");
    }

    const ngo = await ngoRepository.create(ngoData);

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(adminData.password, salt);

    const admin = await userRepository.create({
      ...adminData,
      password: hashedPassword,
      role: "admin",
      ngoId: ngo._id,
    });

    ngo.createdBy = admin._id;
    await ngo.save();

    const token = this.createToken(admin);

    return {
      ngo,
      admin,
      token,
    };
  }

  async login(email, password) {
    const user = await userRepository.findByEmail(email);

    if (!user || !user.isActive) {
      throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    const token = this.createToken(user);

    return {
      user,
      token,
    };
  }

  verifyToken(token) {
    if (!token) {
      throw new Error("No token provided");
    }

    return jwt.verify(token, JWT_SECRET);
  }
}

export default new AuthService();
