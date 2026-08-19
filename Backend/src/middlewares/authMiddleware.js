import authService from "../services/authService.js";
import userRepository from "../repositories/userRepository.js";

const protect = async (req, res, next) => {
  try {
    const [scheme, token] = req.headers.authorization?.split(" ") || [];
    if (scheme !== "Bearer" || !token) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized, no token" });
    }

    const decoded = authService.verifyToken(token);
    const user = await userRepository.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, account is inactive or no longer exists",
      });
    }

    req.user = {
      id: String(user._id),
      role: user.role,
      ngoId: user.ngoId?._id ? String(user.ngoId._id) : null,
    };
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Not authorized, token failed" });
  }
};

export default protect;
