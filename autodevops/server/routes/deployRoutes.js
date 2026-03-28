// ═══════════════════════════════════════════════════
// 🚀 DeployNova — Deploy Routes
// ═══════════════════════════════════════════════════
const router = require("express").Router();
const {
  triggerDeploy,
  getDeployments,
  getDeployment,
  getDeploymentLogs,
  stopDeployment,
  getRunningDeployments,
} = require("../controllers/deployController");
const { protect } = require("../middleware/authMiddleware");
const checkApiKey = require("../middleware/apiKeyMiddleware");

// ── Routes support both JWT and Internal API Key ──
router.use(checkApiKey);

// Only require protect if no system user was set by checkApiKey
router.use((req, res, next) => {
  if (req.user && req.user.isSystem) return next();
  protect(req, res, next);
});

// Running deployments overview
router.get("/running", getRunningDeployments);

// Single deployment detail & logs
router.get("/detail/:deploymentId", getDeployment);
router.get("/logs/:deploymentId", getDeploymentLogs);
router.post("/stop/:deploymentId", stopDeployment);

// Project-level deployment routes
router.post("/:projectId", triggerDeploy);
router.get("/:projectId", getDeployments);

module.exports = router;