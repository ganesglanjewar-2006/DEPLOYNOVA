// ═══════════════════════════════════════════════════
// 🚀 DeployNova — Auth Routes
// ═══════════════════════════════════════════════════
const router = require("express").Router();
const { register, login, getMe, updateGithubToken } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { validate, required, minLength, isEmail } = require("../middleware/validateMiddleware");

// ── Validation Schemas ──
const registerValidation = validate({
  name: [required("Name"), minLength("Name", 2)],
  email: [required("Email"), isEmail()],
  password: [required("Password"), minLength("Password", 6)],
});

const loginValidation = validate({
  email: [required("Email"), isEmail()],
  password: [required("Password")],
});

const githubTokenValidation = validate({
  githubToken: [required("GitHub Token")],
});

// ── Routes ──
router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);
router.get("/me", protect, getMe);
router.put("/github-token", protect, githubTokenValidation, updateGithubToken);

module.exports = router;
