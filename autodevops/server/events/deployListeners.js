// ═══════════════════════════════════════════════════
// 🚀 DeployNova — Deploy Event Listeners
// ═══════════════════════════════════════════════════
const Deployment = require("../models/Deployment");
const Project = require("../models/Project");
const eventBus = require("./eventBus");

/**
 * Registers all deployment-related event listeners.
 * Called once at server startup — updates DB records and
 * broadcasts to Socket.io in real time.
 *
 * @param {import("socket.io").Server} io — Socket.io server instance
 */
function registerDeployListeners(io) {
  // ── Deploy Queued ──
  eventBus.on("deploy:queued", async ({ deploymentId, projectId, userId }) => {
    try {
      io.to(`user:${userId}`).emit("deploy:queued", { deploymentId, projectId });
    } catch (err) {
      console.error("[Event:deploy:queued] Error:", err.message);
    }
  });

  // ── Deploy Stage Change ──
  eventBus.on("deploy:stage", async ({ deploymentId, stage, message }) => {
    try {
      const deployment = await Deployment.findByIdAndUpdate(
        deploymentId,
        {
          status: stage,
          $push: {
            logs: { level: "info", message, stage, timestamp: new Date() },
          },
        },
        { new: true }
      );

      if (deployment) {
        io.to(`user:${deployment.userId}`).emit("deploy:stage", {
          deploymentId,
          stage,
          message,
        });
      }
    } catch (err) {
      console.error("[Event:deploy:stage] Error:", err.message);
    }
  });

  // ── Deploy Log Entry ──
  eventBus.on("deploy:log", async ({ deploymentId, level, message, stage }) => {
    try {
      const deployment = await Deployment.findByIdAndUpdate(
        deploymentId,
        {
          $push: {
            logs: { level, message, stage: stage || "system", timestamp: new Date() },
          },
        },
        { new: true }
      );

      if (deployment) {
        io.to(`user:${deployment.userId}`).emit("deploy:log", {
          deploymentId,
          level,
          message,
          stage,
        });
      }
    } catch (err) {
      console.error("[Event:deploy:log] Error:", err.message);
    }
  });

  // ── Deploy Complete ──
  eventBus.on("deploy:complete", async ({ deploymentId, url, port, buildDuration }) => {
    try {
      const deployment = await Deployment.findByIdAndUpdate(
        deploymentId,
        { status: "live", url, port, buildDuration },
        { new: true }
      );

      if (deployment) {
        // Update project stats
        await Project.findByIdAndUpdate(deployment.projectId, {
          lastDeployedAt: new Date(),
          status: "active",
          $inc: { deployCount: 1 },
        });

        io.to(`user:${deployment.userId}`).emit("deploy:complete", {
          deploymentId,
          url,
          port,
          buildDuration,
        });
      }
    } catch (err) {
      console.error("[Event:deploy:complete] Error:", err.message);
    }
  });

  // ── Deploy Failed ──
  eventBus.on("deploy:failed", async ({ deploymentId, error, stage }) => {
    try {
      const deployment = await Deployment.findByIdAndUpdate(
        deploymentId,
        {
          status: "failed",
          $push: {
            logs: { level: "error", message: error, stage: stage || "system", timestamp: new Date() },
          },
        },
        { new: true }
      );

      if (deployment) {
        await Project.findByIdAndUpdate(deployment.projectId, { status: "active" });

        io.to(`user:${deployment.userId}`).emit("deploy:failed", {
          deploymentId,
          error,
          stage,
        });
      }
    } catch (err) {
      console.error("[Event:deploy:failed] Error:", err.message);
    }
  });

  console.log("[EventBus] 🎧 Deploy event listeners registered");
}

module.exports = registerDeployListeners;
