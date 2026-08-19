import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import userRepository from "../repositories/userRepository.js";
import ngoRepository from "../repositories/ngoRepository.js";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const MAX_REFRESH_SESSIONS = 5;

class AuthService {
  createAccessToken(user) {
    const payload = {
      id: user._id,
      role: user.role,
    };

    // Super Admin has no NGO. Admin, coordinator, and volunteer do.
    if (user.role !== "super_admin" && user.ngoId) {
      payload.ngoId = user.ngoId._id || user.ngoId;
    }

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
    });
  }

  createRefreshToken(user) {
    return jwt.sign(
      { id: user._id, type: "refresh", jti: crypto.randomUUID() },
      JWT_REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d" },
    );
  }

  hashRefreshToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async issueTokenPair(user) {
    const accessToken = this.createAccessToken(user);
    const refreshToken = this.createRefreshToken(user);
    await userRepository.addRefreshTokenHash(
      user._id,
      this.hashRefreshToken(refreshToken),
      MAX_REFRESH_SESSIONS,
    );

    return { accessToken, refreshToken };
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

    const { accessToken: token, refreshToken } = await this.issueTokenPair(admin);

    return {
      ngo,
      admin,
      token,
      refreshToken,
    };
  }

  async login(email, password) {
    const user = await userRepository.findByEmail(email);

    if (!user || !user.isActive) {
      const error = new Error("Invalid credentials");
      error.status = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const error = new Error("Invalid credentials");
      error.status = 401;
      throw error;
    }

    const { accessToken: token, refreshToken } = await this.issueTokenPair(user);

    return {
      user,
      token,
      refreshToken,
    };
  }

  async refresh(rawToken) {
    if (!rawToken) {
      const error = new Error("Refresh token is required");
      error.status = 401;
      throw error;
    }

    let payload;
    try {
      payload = jwt.verify(rawToken, JWT_REFRESH_SECRET);
    } catch {
      const error = new Error("Invalid or expired refresh token");
      error.status = 401;
      throw error;
    }

    if (payload.type !== "refresh") {
      const error = new Error("Invalid refresh token");
      error.status = 401;
      throw error;
    }

    const user = await userRepository.findById(payload.id);
    const oldHash = this.hashRefreshToken(rawToken);
    if (!user || !user.isActive) {
      const error = new Error("Refresh token has been revoked");
      error.status = 401;
      throw error;
    }

    const token = this.createAccessToken(user);
    const refreshToken = this.createRefreshToken(user);
    const rotatedUser = await userRepository.rotateRefreshTokenHash(
      user._id,
      oldHash,
      this.hashRefreshToken(refreshToken),
      MAX_REFRESH_SESSIONS,
    );
    if (!rotatedUser) {
      const error = new Error("Refresh token has been revoked");
      error.status = 401;
      throw error;
    }
    return { user: rotatedUser, token, refreshToken };
  }

  async revokeRefreshToken(rawToken) {
    if (!rawToken) return;
    try {
      const payload = jwt.verify(rawToken, JWT_REFRESH_SECRET, { ignoreExpiration: true });
      const tokenHash = this.hashRefreshToken(rawToken);
      await userRepository.removeRefreshTokenHash(payload.id, tokenHash);
    } catch {
      // Logout remains idempotent even for malformed/expired cookies.
    }
  }

  verifyToken(token) {
    if (!token) {
      throw new Error("No token provided");
    }

    return jwt.verify(token, JWT_SECRET);
  }
}

export default new AuthService();
