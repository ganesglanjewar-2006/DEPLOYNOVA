// ═══════════════════════════════════════════════════
// 🚀 DeployNova — Project Controller
// ═══════════════════════════════════════════════════
const Project = require("../models/Project");
const Deployment = require("../models/Deployment");
const eventBus = require("../events/eventBus");

// ── POST /api/projects ──
exports.createProject = async (req, res, next) => {
  try {
    const { name, repoUrl, framework, branch, rootDirectory, customBuildCmd, customStartCmd, envVars } = req.body;

    const project = await Project.create({
      userId: req.user._id,
      name,
      repoUrl,
      framework,
      branch,
      rootDirectory,
      customBuildCmd,
      customStartCmd,
      envVars,
    });

    eventBus.dispatch("project:created", {
      projectId: project._id,
      userId: req.user._id.toString(),
    });

    res.status(201).json({
      success: true,
      project,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/projects ──
exports.getProjects = async (req, res, next) => {
  try {
    const { status, framework, sort } = req.query;

    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    if (framework) filter.framework = framework;

    const sortOption = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const projects = await Project.find(filter).sort(sortOption);

    // Attach last deployment status for each project
    const projectsWithDeploy = await Promise.all(
      projects.map(async (project) => {
        const lastDeploy = await Deployment.findOne({ projectId: project._id })
          .sort({ createdAt: -1 })
          .select("status url createdAt");

        return {
          ...project.toObject(),
          lastDeployment: lastDeploy || null,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: projectsWithDeploy.length,
      projects: projectsWithDeploy,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/projects/:id ──
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    // Get recent deployments
    const deployments = await Deployment.find({ projectId: project._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("status url buildDuration triggeredBy createdAt");

    res.status(200).json({
      success: true,
      project: {
        ...project.toObject(),
        recentDeployments: deployments,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/projects/:id ──
exports.updateProject = async (req, res, next) => {
  try {
    const { name, repoUrl, framework, branch, rootDirectory, customBuildCmd, customStartCmd, envVars } = req.body;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name, repoUrl, framework, branch, rootDirectory, customBuildCmd, customStartCmd, envVars },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      project,
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/projects/:id ──
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    // Delete associated deployments
    await Deployment.deleteMany({ projectId: project._id });

    eventBus.dispatch("project:deleted", {
      projectId: project._id,
      userId: req.user._id.toString(),
    });

    res.status(200).json({
      success: true,
      message: "Project and all associated deployments deleted",
    });
  } catch (err) {
    next(err);
  }
};
