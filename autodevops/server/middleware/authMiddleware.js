// ═══════════════════════════════════════════════════
// 🚀 DeployNova — Auth Middleware (JWT Guard)
// ═══════════════════════════════════════════════════
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protects routes — verifies JWT and attaches req.user
 */
const protect = async (req, res, next) => {
  try {
    let token = null;

    // Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Not authorized — no token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request (exclude password)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Not authorized — user no longer exists",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Not authorized — invalid token",
    });
  }
};

/**
 * Role-based access control
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Role '${req.user.role}' is not authorized for this action`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
