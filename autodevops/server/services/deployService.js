// ═══════════════════════════════════════════════════
// 🚀 DeployNova — Deployment Service (Core Engine)
// ═══════════════════════════════════════════════════
const { exec, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const os = require("os");
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

    const child = exec(cmd, { 
      cwd, 
      maxBuffer: 1024 * 1024 * 50, 
      shell: true 
    });

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
        const errorMsg = output.split("\n").slice(-5).join(" ").trim();
        reject(
          new Error(`Command failed (Exit ${code}): ${cmd} ${errorMsg ? ` | Error: ${errorMsg}` : ""}`)
        );
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

  // 💎 VERCEL-LEVEL ISOLATION: Forced absolute path in system root
  // We use a very short path (C:\DN_Builds) to avoid 260-char Windows limits
  const baseDir = "C:\\DN_Builds";
  const deployDir = path.join(baseDir, "deployments", `${project.name}-${uuidv4().substring(0, 8)}`);

  try {
    // Ensure absolute infrastructure exists
    if (!fs.existsSync(baseDir)) {
      try {
        fs.mkdirSync(baseDir, { recursive: true });
      } catch (err) {
        // Fallback to a secondary root if C:\ is completely blocked
        const fallbackBase = "C:\\DeployNova_Infrastructure";
        if (!fs.existsSync(fallbackBase)) fs.mkdirSync(fallbackBase, { recursive: true });
      }
    }
    const deploymentsDir = path.join(baseDir, "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // ── STAGE 0: System Health (The "Extra" Polish) ──
    const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024);
    const freeMem = Math.round(os.freemem() / 1024 / 1024 / 1024);
    const cpuCount = os.cpus().length;

    eventBus.dispatch("deploy:log", {
      deploymentId,
      level: "info",
      message: `🖥️  SYSTEM HEALTH: ${cpuCount} Cores | ${freeMem}GB/${totalMem}GB RAM Available`,
      stage: "prep",
    });

    eventBus.dispatch("deploy:log", {
      deploymentId,
      level: "info",
      message: `🚀 INFRASTRUCTURE: Hard-Isolated at ${baseDir}`,
      stage: "prep",
    });

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

    // ── STAGE 1.5: Intelligent Monorepo Discovery ──
    let buildRoot = deployDir;
    const commonPaths = ["autodevops/server", "server", "backend", "api"];
    
    for (const subPath of commonPaths) {
      const fullSubPath = path.join(deployDir, subPath);
      if (fs.existsSync(path.join(fullSubPath, "package.json"))) {
        buildRoot = fullSubPath;
        eventBus.dispatch("deploy:log", {
          deploymentId,
          level: "info",
          message: `🔍 Discovery: Detected Backend in ${subPath}`,
          stage: "discovery",
        });
        break;
      }
    }

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

    const pkgPath = path.join(buildRoot, "package.json");
    if (fs.existsSync(pkgPath)) {
      const cacheDir = path.resolve(baseDir, "cache", project._id.toString());
      const cacheModules = path.join(cacheDir, "node_modules");
      const fingerprintFile = path.join(cacheDir, "fingerprint.txt");

      // Ensure cache structure exists
      if (!fs.existsSync(cacheModules)) {
        fs.mkdirSync(cacheModules, { recursive: true });
      }

      const targetModules = path.join(buildRoot, "node_modules");

      // Calculate new fingerprint
      const newFingerprint = getFingerprint(buildRoot);
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

        // 🔗 TRY INSTANT LINK
        try {
          if (fs.existsSync(targetModules)) {
            fs.rmSync(targetModules, { recursive: true, force: true });
          }
          fs.symlinkSync(cacheModules, targetModules, "junction");
        } catch (err) {
          eventBus.dispatch("deploy:log", {
            deploymentId,
            level: "warn",
            message: `⚠️ Quick-link unavailable (${err.code}). Reverting to Standard path.`,
            stage: "install",
          });
          // Fallback: Copy what we have
          try {
            fs.cpSync(cacheModules, targetModules, { recursive: true });
          } catch (cpErr) {
            /* ignore fallback failure */
          }
        }
      } else {
        // Dependencies changed or first install
        eventBus.dispatch("deploy:log", {
          deploymentId,
          level: "info",
          message: oldFingerprint
            ? "🔄 Dependencies updated. Re-installing..."
            : "📦 Fresh install starting...",
          stage: "install",
        });

        // 🛡️ RECOVERY-ENABLED INSTALL
        try {
          // 1. Try Junction Route (Optimal)
          try {
            if (fs.existsSync(targetModules)) {
              fs.rmSync(targetModules, { recursive: true, force: true });
            }
            fs.symlinkSync(cacheModules, targetModules, "junction");
          } catch (linkErr) {
            /* proceed without link if junction fails */
          }

          // 2. Perform Install
          await runCommand(
            "npm install --production --prefer-offline --no-audit --no-fund",
            buildRoot,
            deploymentId,
            "install"
          );

        } catch (installErr) {
          // 3. 🚑 SELF-HEALING: If anything failed, try Normal mode
          eventBus.dispatch("deploy:log", {
            deploymentId,
            level: "warn",
            message: "🚑 Self-Healing: Optimized path failed. Retrying 100% Clean Install...",
            stage: "install",
          });

          // Unlink and wipe
          try {
            if (fs.existsSync(targetModules)) {
              fs.rmSync(targetModules, { recursive: true, force: true });
            }
            if (!fs.existsSync(cacheDir)) {
              fs.mkdirSync(cacheDir, { recursive: true });
            }
          } catch (cleanErr) {
            /* ignore cleanup errors */
          }

          // Force fresh install in real directory (without junction)
          await runCommand(
            "npm install --production --prefer-offline --no-audit --no-fund",
            buildRoot,
            deploymentId,
            "install"
          );
        }

        // Update fingerprint ONLY if install succeeded
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
      await runCommand(buildCmd, buildRoot, deploymentId, "build");

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
    
    // Dynamic starting detection
    let startCmd = project.customStartCmd;
    if (!startCmd) {
      if (fs.existsSync(path.join(buildRoot, "server.js"))) {
        startCmd = "node server.js";
      } else if (fs.existsSync(path.join(buildRoot, "index.js"))) {
        startCmd = "node index.js";
      } else {
        startCmd = "npm start";
      }
    }

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
      cwd: buildRoot,
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

    // ── COMPLETE ──
    const buildDuration = Date.now() - startTime;
    const url = `http://localhost:${port}`;

    // Update deployment with process info
    await Deployment.findByIdAndUpdate(deploymentId, {
      processId: appProcess.pid,
    });

    // 🧹 AUTO-CLEANUP: Kill and remove old deployments for this project
    try {
      const otherDeploys = await Deployment.find({
        projectId: project._id,
        _id: { $ne: deploymentId },
        status: { $in: ["live", "starting", "installing"] },
      });

      for (const old of otherDeploys) {
        // Stop process if running
        await stopDeployment(old._id.toString());
        // Note: Disk cleanup of folders is handled during the next cycle
        // to avoid race conditions with live traffic.
      }
    } catch (err) {
      // non-critical cleanup
    }

    eventBus.dispatch("deploy:complete", {
      deploymentId,
      url,
      port,
      buildDuration,
    });

    return { url, port, buildDuration };
  } catch (err) {
    // 📝 Log error to terminal output for transparency
    eventBus.dispatch("deploy:log", {
      deploymentId,
      level: "error",
      message: `❌ SYSTEM ERROR: ${err.message}`,
      stage: "system",
    });

    eventBus.dispatch("deploy:failed", {
      deploymentId,
      error: err.message,
      stage: "system",
    });

    // Save error to database for persistence
    await Deployment.findByIdAndUpdate(deploymentId, { error: err.message });

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
