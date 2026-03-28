// ═══════════════════════════════════════════════════
// 🚀 DeployNova — GitHub Routes
// ═══════════════════════════════════════════════════
const router = require("express").Router();
const { listRepos, getRepoDetails, handleWebhook } = require("../controllers/githubController");
const { protect } = require("../middleware/authMiddleware");

// ── Webhook route (no auth — called by GitHub) ──
router.post("/webhook", handleWebhook);

// ── Authenticated routes ──
router.get("/repos", protect, listRepos);
router.get("/repos/:owner/:repo", protect, getRepoDetails);

module.exports = router;
