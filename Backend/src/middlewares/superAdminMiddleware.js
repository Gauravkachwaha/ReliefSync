const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Super Admin access is required",
    });
  }

  next();
};

export default requireSuperAdmin;
