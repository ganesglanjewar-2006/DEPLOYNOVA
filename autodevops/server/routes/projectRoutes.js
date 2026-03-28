// ═══════════════════════════════════════════════════
// 🚀 DeployNova — Project Routes
// ═══════════════════════════════════════════════════
const router = require("express").Router();
const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
} = require("../controllers/projectController");
const { protect } = require("../middleware/authMiddleware");
const {
  validate,
  required,
  minLength,
  isGitHubURL,
  isIn,
} = require("../middleware/validateMiddleware");

// ── Validation Schemas ──
const createProjectValidation = validate({
  name: [required("Project name"), minLength("Project name", 2)],
  repoUrl: [required("Repository URL"), isGitHubURL()],
  framework: [isIn("Framework", ["react", "next", "vue", "node", "static", "other"])],
});

const updateProjectValidation = validate({
  name: [minLength("Project name", 2)],
});

const checkApiKey = require("../middleware/apiKeyMiddleware");

// ── All routes support both JWT and Internal API Key ──
router.use(checkApiKey);

// Only require protect if no system user was set by checkApiKey
router.use((req, res, next) => {
  if (req.user && req.user.isSystem) return next();
  protect(req, res, next);
});

router.route("/")
  .get(getProjects)
  .post(createProjectValidation, createProject);

router.route("/:id")
  .get(getProject)
  .put(updateProjectValidation, updateProject)
  .delete(deleteProject);

module.exports = router;
