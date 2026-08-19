const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to perform this action",
    });
  }

  next();
};

const requireNgoMembership = (req, res, next) => {
  if (!req.user?.ngoId) {
    return res.status(403).json({
      success: false,
      message: "An NGO membership is required for this action",
    });
  }

  next();
};

export { requireRole, requireNgoMembership };
