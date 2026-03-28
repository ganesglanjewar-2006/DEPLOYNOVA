// ═══════════════════════════════════════════════════
// 🚀 DeployNova — Deployment Service (Core Engine)
// ═══════════════════════════════════════════════════
const { exec, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const eventBus = require("../events/eventBus");
const Deployment = require("../models/Deployment");

// Track running processes so we can stop them
const runningProcesses = new Map();

// Dynamic port allocation
let nextPort = parseInt(process.env.DEPLOY_PORT_START || "4000", 10);
const maxPort = parseInt(process.env.DEPLOY_PORT_END || "4100", 10);

function getNextPort() {
  const port = nextPort;
  nextPort = nextPort >= maxPort ? parseInt(process.env.DEPLOY_PORT_START || "4000", 10) : nextPort + 1;
  return port;
}

/**
 * Execute a shell command and return a Promise.
 * Streams stdout/stderr to the event bus.
 */
function runCommand(cmd, cwd, deploymentId, stage) {
  return new Promise((resolve, reject) => {
    eventBus.dispatch("deploy:log", {
      deploymentId,
      level: "info",
      message: `$ ${cmd}`,
      stage,
    });

    const child = exec(cmd, { cwd, maxBuffer: 1024 * 1024 * 10 });

    let output = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
      const lines = data.toString().trim().split("\n");
      for (const line of lines) {
        if (line.trim()) {
          eventBus.dispatch("deploy:log", {
            deploymentId,
            level: "info",
            message: line.trim(),
            stage,
          });
        }
      }
    });

    child.stderr.on("data", (data) => {
      const lines = data.toString().trim().split("\n");
      for (const line of lines) {
        if (line.trim()) {
          eventBus.dispatch("deploy:log", {
            deploymentId,
            level: "warn",
            message: line.trim(),
            stage,
          });
        }
      }
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${cmd}`));
      }
    });

    child.on("error", reject);
  });
}

/**
 * Calculate a fingerprint of the project's dependencies
 */
function getFingerprint(dir) {
  try {
    const pkgPath = path.join(dir, "package.json");
    const lockPath = path.join(dir, "package-lock.json");
    let content = "";

    if (fs.existsSync(pkgPath)) {
      content += fs.readFileSync(pkgPath, "utf8");
    }
    if (fs.existsSync(lockPath)) {
      content += fs.readFileSync(lockPath, "utf8");
    }

    if (!content) return null;
    return crypto.createHash("sha1").update(content).digest("hex");
  } catch (err) {
    return null;
  }
}

/**
 * ═══════════════════════════════════════════════════
 * MAIN DEPLOYMENT PIPELINE
 * Clone → Install → Build → Start
 * ═══════════════════════════════════════════════════
 */
async function deployProject({ deployment, project }) {
  const deploymentId = deployment._id.toString();
  const startTime = Date.now();

  const deployDir = path.resolve(
    process.env.DEPLOY_BASE_DIR || "./deployments",
    `${project.name}-${uuidv4().substring(0, 8)}`
  );

  try {
    // Ensure base deploy directory exists
    const baseDir = path.resolve(process.env.DEPLOY_BASE_DIR || "./deployments");
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    // ── STAGE 1: Clone ──
    eventBus.dispatch("deploy:stage", {
      deploymentId,
      stage: "cloning",
      message: `Cloning ${project.repoUrl} (branch: ${project.branch || "main"})...`,
    });

    const branch = project.branch || "main";
    await runCommand(
      `git clone --branch ${branch} --single-branch --depth 1 ${project.repoUrl} "${deployDir}"`,
      process.cwd(),
      deploymentId,
      "clone"
    );

    eventBus.dispatch("deploy:log", {
      deploymentId,
      level: "success",
      message: "✅ Repository cloned successfully",
      stage: "clone",
    });

    // Try to read commit hash
    try {
      const commitOutput = await runCommand("git rev-parse HEAD", deployDir, deploymentId, "clone");
      const commitHash = commitOutput.trim();
      await Deployment.findByIdAndUpdate(deploymentId, { commitHash });
    } catch {
      // non-critical, continue
    }

    // ── STAGE 2: Install ──
    eventBus.dispatch("deploy:stage", {
      deploymentId,
      stage: "installing",
      message: "Processing dependencies...",
    });

    const pkgPath = path.join(deployDir, "package.json");
    if (fs.existsSync(pkgPath)) {
      const cacheDir = path.resolve(baseDir, "cache", project._id.toString());
      const cacheModules = path.join(cacheDir, "node_modules");
      const fingerprintFile = path.join(cacheDir, "fingerprint.txt");

      // Ensure cache structure exists
      if (!fs.existsSync(cacheModules)) {
        fs.mkdirSync(cacheModules, { recursive: true });
      }

      const targetModules = path.join(deployDir, "node_modules");

      // Calculate new fingerprint
      const newFingerprint = getFingerprint(deployDir);
      let oldFingerprint = "";

      if (fs.existsSync(fingerprintFile)) {
        oldFingerprint = fs.readFileSync(fingerprintFile, "utf8").trim();
      }

      // ⚡ CHECK FOR BYPASS ⚡
      if (newFingerprint && newFingerprint === oldFingerprint) {
        eventBus.dispatch("deploy:log", {
          deploymentId,
          level: "success",
          message: "⚡ Zero-Install: Dependencies unchanged. Bypassing install stage.",
          stage: "install",
        });

        // Link the existing cache
        try {
          if (fs.existsSync(targetModules)) {
            fs.rmSync(targetModules, { recursive: true, force: true });
          }
          fs.symlinkSync(cacheModules, targetModules, "junction");
        } catch (err) {
          // fallback
        }
      } else {
        // Dependencies changed or first install
        eventBus.dispatch("deploy:log", {
          deploymentId,
          level: "info",
          message:
            oldFingerprint ? "🔄 Dependencies updated. Re-installing..." : "📦 Fresh install starting...",
          stage: "install",
        });

        // Link (to ensure cache is updated directly)
        try {
          if (fs.existsSync(targetModules)) {
            fs.rmSync(targetModules, { recursive: true, force: true });
          }
          fs.symlinkSync(cacheModules, targetModules, "junction");
        } catch (err) {
          // fallback
        }

        // Run optimized install
        await runCommand(
          "npm install --production --prefer-offline --no-audit --no-fund",
          deployDir,
          deploymentId,
          "install"
        );

        // Update fingerprint
        if (newFingerprint) {
          fs.writeFileSync(fingerprintFile, newFingerprint);
        }
      }

      eventBus.dispatch("deploy:log", {
        deploymentId,
        level: "success",
        message: "✅ Dependencies ready",
        stage: "install",
      });
    } else {
      eventBus.dispatch("deploy:log", {
        deploymentId,
        level: "warn",
        message: "⚠️ No package.json found — skipping install",
        stage: "install",
      });
    }

    // ── STAGE 3: Build ──
    const needsBuild = ["react", "next", "vue"].includes(project.framework);
    if (needsBuild || project.customBuildCmd) {
      eventBus.dispatch("deploy:stage", {
        deploymentId,
        stage: "building",
        message: "Building project...",
      });

      const buildCmd = project.customBuildCmd || "npm run build";
      await runCommand(buildCmd, deployDir, deploymentId, "build");

      eventBus.dispatch("deploy:log", {
        deploymentId,
        level: "success",
        message: "✅ Build completed",
        stage: "build",
      });
    }

    // ── STAGE 4: Start ──
    eventBus.dispatch("deploy:stage", {
      deploymentId,
      stage: "starting",
      message: "Starting application...",
    });

    const port = getNextPort();
    const startCmd = project.customStartCmd || "node server.js";

    // Build environment vars
    const env = {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: "production",
    };

    // Add project environment variables
    if (project.envVars) {
      for (const [key, value] of project.envVars.entries()) {
        env[key] = value;
      }
    }

    // Spawn the application process
    const parts = startCmd.split(" ");
    const appProcess = spawn(parts[0], parts.slice(1), {
      cwd: deployDir,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    // Store the process reference
    runningProcesses.set(deploymentId, {
      process: appProcess,
      port,
      dir: deployDir,
    });

    appProcess.stdout.on("data", (data) => {
      eventBus.dispatch("deploy:log", {
        deploymentId,
        level: "info",
        message: data.toString().trim(),
        stage: "start",
      });
    });

    appProcess.stderr.on("data", (data) => {
      eventBus.dispatch("deploy:log", {
        deploymentId,
        level: "warn",
        message: data.toString().trim(),
        stage: "start",
      });
    });

    appProcess.on("close", (code) => {
      runningProcesses.delete(deploymentId);
      if (code !== 0 && code !== null) {
        eventBus.dispatch("deploy:failed", {
          deploymentId,
          error: `Process exited with code ${code}`,
          stage: "start",
        });
      }
    });

    // Wait a moment for the app to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check if process is still alive
    if (appProcess.exitCode !== null) {
      throw new Error("Application process exited immediately after start");
    }

    const buildDuration = Date.now() - startTime;
    const url = `http://localhost:${port}`;

    // Update deployment with process info
    await Deployment.findByIdAndUpdate(deploymentId, {
      processId: appProcess.pid,
    });

    // ── COMPLETE ──
    eventBus.dispatch("deploy:complete", {
      deploymentId,
      url,
      port,
      buildDuration,
    });

    return { url, port, buildDuration };
  } catch (err) {
    eventBus.dispatch("deploy:failed", {
      deploymentId,
      error: err.message,
      stage: "system",
    });

    throw err;
  }
}

/**
 * Stop a running deployment
 */
async function stopDeployment(deploymentId) {
  const running = runningProcesses.get(deploymentId);
  if (running) {
    running.process.kill("SIGTERM");
    runningProcesses.delete(deploymentId);

    await Deployment.findByIdAndUpdate(deploymentId, { status: "stopped" });

    eventBus.dispatch("deploy:log", {
      deploymentId,
      level: "info",
      message: "🛑 Deployment stopped",
      stage: "cleanup",
    });

    return true;
  }
  return false;
}

/**
 * Get all running deployments
 */
function getRunningDeployments() {
  const result = [];
  for (const [id, info] of runningProcesses) {
    result.push({
      deploymentId: id,
      port: info.port,
      dir: info.dir,
      pid: info.process.pid,
    });
  }
  return result;
}

module.exports = {
  deployProject,
  stopDeployment,
  getRunningDeployments,
};
