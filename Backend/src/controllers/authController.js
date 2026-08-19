import authService from "../services/authService.js";

const REFRESH_COOKIE = "reliefsync_refresh";
const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const readCookie = (req, name) => {
  const cookie = req.headers.cookie || "";
  const entry = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
};

const sendAuthResult = (res, result, status = 200, message = "Login successful") => {
  const { refreshToken, ...publicResult } = result;
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return res.status(status).json({ success: true, message, data: publicResult });
};

const registerNgo = async (req, res, next) => {
  try {
    const { ngo, admin } = req.body;

    if (!ngo || !admin) {
      return res.status(400).json({
        success: false,
        message: "NGO and admin data are required",
      });
    }

    const result = await authService.registerNgo(ngo, admin);

    return sendAuthResult(res, result, 201, "NGO and Admin account created successfully");
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await authService.login(email, password);

    return sendAuthResult(res, result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
};

const refresh = async (req, res) => {
  try {
    const result = await authService.refresh(readCookie(req, REFRESH_COOKIE));
    return sendAuthResult(res, result, 200, "Token refreshed");
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    return res.status(err.status || 401).json({ success: false, message: err.message });
  }
};

const logout = async (req, res) => {
  await authService.revokeRefreshToken(readCookie(req, REFRESH_COOKIE));
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
  return res.json({ success: true, message: "Logged out successfully" });
};

// Named exports as you wanted
export { registerNgo, login, refresh, logout };
