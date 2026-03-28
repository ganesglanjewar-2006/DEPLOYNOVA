// ═══════════════════════════════════════════════════
// 🚀 DeployNova — Auth Controller
// ═══════════════════════════════════════════════════
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Generate a signed JWT for a user.
 */
function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
}

/**
 * Send token response with user data.
 */
function sendTokenResponse(user, statusCode, res) {
  const token = generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      githubToken: user.githubToken ? "***connected***" : null,
      createdAt: user.createdAt,
    },
  });
}

// ── POST /api/auth/register ──
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "An account with this email already exists",
      });
    }

    const user = await User.create({ name, email, password });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/login ──
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and explicitly include password
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auth/me ──
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        githubToken: user.githubToken ? "***connected***" : null,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/auth/github-token ──
exports.updateGithubToken = async (req, res, next) => {
  try {
    const { githubToken } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { githubToken },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "GitHub token updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        githubToken: user.githubToken ? "***connected***" : null,
      },
    });
  } catch (err) {
    next(err);
  }
};
