// ═══════════════════════════════════════════════════
// 🚀 DeployNova — Deploy Controller
// ═══════════════════════════════════════════════════
const Project = require("../models/Project");
const Deployment = require("../models/Deployment");
const deployService = require("../services/deployService");
const eventBus = require("../events/eventBus");

// ── POST /api/deploy/:projectId ──
exports.triggerDeploy = async (req, res, next) => {
  try {
    const query = { _id: req.params.projectId };
    if (!req.user.isSystem) {
      query.userId = req.user._id;
    }

    const project = await Project.findOne(query);

    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    // Prevent overlapping deployments
    const activeDeployment = await Deployment.findOne({
      projectId: project._id,
      status: { $in: ["queued", "cloning", "installing", "building", "starting"] },
    });

    if (activeDeployment) {
      return res.status(409).json({
        success: false,
        error: "A deployment is already in progress for this project",
        activeDeploymentId: activeDeployment._id,
      });
    }

    // Create new deployment record
    const deployment = await Deployment.create({
      projectId: project._id,
      userId: req.user._id,
      status: "queued",
      branch: project.branch || "main",
      triggeredBy: req.body.triggeredBy || "manual",
      environment: project.envVars || {},
    });

    // Update project status
    await Project.findByIdAndUpdate(project._id, { status: "deploying" });

    // Emit queued event
    eventBus.dispatch("deploy:queued", {
      deploymentId: deployment._id.toString(),
      projectId: project._id.toString(),
      userId: req.user._id.toString(),
    });

    // Respond immediately — deployment runs in background
    res.status(202).json({
      success: true,
      message: "Deployment queued successfully",
      deployment: {
        id: deployment._id,
        status: "queued",
        projectId: project._id,
      },
    });

    // Run deployment pipeline asynchronously
    deployService
      .deployProject({ deployment, project })
      .then((result) => {
        console.log(`[DeployNova] ✅ Deploy complete: ${result.url}`);
      })
      .catch((err) => {
        console.error(`[DeployNova] ❌ Deploy failed: ${err.message}`);
      });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/deploy/:projectId ──
exports.getDeployments = async (req, res, next) => {
  try {
    const query = { _id: req.params.projectId };
    if (!req.user.isSystem) {
      query.userId = req.user._id;
    }

    const project = await Project.findOne(query);

    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    const { status, limit = 20, page = 1 } = req.query;
    const filter = { projectId: project._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Deployment.countDocuments(filter);

    const deployments = await Deployment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-logs"); // exclude logs for list view

    res.status(200).json({
      success: true,
      count: deployments.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      deployments,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/deploy/detail/:deploymentId ──
exports.getDeployment = async (req, res, next) => {
  try {
    const deployment = await Deployment.findOne({
      _id: req.params.deploymentId,
      userId: req.user._id,
    }).populate("projectId", "name repoUrl framework");

    if (!deployment) {
      return res.status(404).json({ success: false, error: "Deployment not found" });
    }

    res.status(200).json({
      success: true,
      deployment,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/deploy/logs/:deploymentId ──
exports.getDeploymentLogs = async (req, res, next) => {
  try {
    const deployment = await Deployment.findOne({
      _id: req.params.deploymentId,
      userId: req.user._id,
    }).select("logs status");

    if (!deployment) {
      return res.status(404).json({ success: false, error: "Deployment not found" });
    }

    res.status(200).json({
      success: true,
      status: deployment.status,
      logs: deployment.logs,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/deploy/stop/:deploymentId ──
exports.stopDeployment = async (req, res, next) => {
  try {
    const deployment = await Deployment.findOne({
      _id: req.params.deploymentId,
      userId: req.user._id,
    });

    if (!deployment) {
      return res.status(404).json({ success: false, error: "Deployment not found" });
    }

    const stopped = await deployService.stopDeployment(req.params.deploymentId);

    if (stopped) {
      res.status(200).json({
        success: true,
        message: "Deployment stopped successfully",
      });
    } else {
      res.status(400).json({
        success: false,
        error: "Deployment is not currently running",
      });
    }
  } catch (err) {
    next(err);
  }
};

// ── GET /api/deploy/running ──
exports.getRunningDeployments = async (req, res, next) => {
  try {
    const running = deployService.getRunningDeployments();

    res.status(200).json({
      success: true,
      count: running.length,
      deployments: running,
    });
  } catch (err) {
    next(err);
  }
};