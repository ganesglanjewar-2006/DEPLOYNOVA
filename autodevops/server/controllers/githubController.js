// ═══════════════════════════════════════════════════
// 🚀 DeployNova — GitHub Controller
// ═══════════════════════════════════════════════════
const User = require("../models/User");
const Project = require("../models/Project");
const Deployment = require("../models/Deployment");
const githubService = require("../services/githubService");
const deployService = require("../services/deployService");
const eventBus = require("../events/eventBus");

// ── GET /api/github/repos ──
exports.listRepos = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.githubToken) {
      return res.status(400).json({
        success: false,
        error: "GitHub token not connected. Update your GitHub token first.",
      });
    }

    const repos = await githubService.getUserRepos(user.githubToken);

    res.status(200).json({
      success: true,
      count: repos.length,
      repos,
    });
  } catch (err) {
    if (err.response && err.response.status === 401) {
      return res.status(401).json({
        success: false,
        error: "GitHub token is invalid or expired",
      });
    }
    next(err);
  }
};

// ── GET /api/github/repos/:owner/:repo ──
exports.getRepoDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.githubToken) {
      return res.status(400).json({
        success: false,
        error: "GitHub token not connected",
      });
    }

    const { owner, repo } = req.params;
    const repoDetails = await githubService.getRepoDetails(user.githubToken, owner, repo);
    const branches = await githubService.getRepoBranches(user.githubToken, owner, repo);

    res.status(200).json({
      success: true,
      repo: repoDetails,
      branches,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/github/webhook ──
// Receives GitHub push events and auto-deploys matching projects
exports.handleWebhook = async (req, res, next) => {
  try {
    const event = req.headers["x-github-event"];

    // Only handle push events
    if (event !== "push") {
      return res.status(200).json({ success: true, message: `Event '${event}' ignored` });
    }

    const { repository, ref, after } = req.body;
    const repoUrl = repository.html_url;
    const branch = ref.replace("refs/heads/", "");
    const commitHash = after;

    // Emit event on the bus
    eventBus.dispatch("github:push", { repoUrl, branch, commitHash });

    // Find all projects matching this repo + branch
    const projects = await Project.find({
      repoUrl: { $regex: new RegExp(repository.full_name, "i") },
      branch,
      status: { $ne: "deploying" },
    });

    if (projects.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No matching projects found for auto-deploy",
      });
    }

    // Trigger deployment for each matching project
    const results = [];
    for (const project of projects) {
      try {
        const deployment = await Deployment.create({
          projectId: project._id,
          userId: project.userId,
          status: "queued",
          branch,
          commitHash,
          triggeredBy: "webhook",
          environment: project.envVars || {},
        });

        await Project.findByIdAndUpdate(project._id, { status: "deploying" });

        eventBus.dispatch("deploy:queued", {
          deploymentId: deployment._id.toString(),
          projectId: project._id.toString(),
          userId: project.userId.toString(),
        });

        // Run asynchronously
        deployService.deployProject({ deployment, project }).catch(console.error);

        results.push({ projectId: project._id, deploymentId: deployment._id, status: "queued" });
      } catch (err) {
        results.push({ projectId: project._id, error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Triggered ${results.length} deployment(s)`,
      results,
    });
  } catch (err) {
    next(err);
  }
};
