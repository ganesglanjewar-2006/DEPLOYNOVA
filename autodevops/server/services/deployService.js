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

// 💎 PLATFORM DETECTION: OS-Agnostic support
const isWindows = os.platform() === "win32";

// Dynamic port allocation (Starting at 5000 to avoid collisions with 4xxx ecosystem)
let nextPort = parseInt(process.env.DEPLOY_PORT_START || "5000", 10);
const maxPort = parseInt(process.env.DEPLOY_PORT_END || "6000", 10);

function getNextPort() {
  const port = nextPort;
  nextPort = nextPort >= maxPort ? parseInt(process.env.DEPLOY_PORT_START || "5000", 10) : nextPort + 1;
  return port;
}

/**
 * Execute a shell command and return a Promise.
 * Streams stdout/stderr to the event bus and persists to the database.
 */
async function runCommand(cmd, cwd, deploymentId, stage) {
  const saveLog = async (message, level = "info") => {
    // ⚡ STREAM (Live)
    eventBus.dispatch("deploy:log", { deploymentId, level, message, stage });
    
    // 💾 PERSIST (Database)
    try {
      await Deployment.findByIdAndUpdate(deploymentId, {
        $push: { logs: { message, level, stage, timestamp: new Date() } }
      });
    } catch (err) {
      /* non-critical database log failure */
    }
  };

  return new Promise((resolve, reject) => {
    saveLog(`$ ${cmd}`);

    // 🛠️ SMART PATH INJECTOR (Ensure Windows finds 'vite', 'tsc', etc.)
    const localBin = path.join(cwd, "node_modules", ".bin");
    const combinedEnv = { 
      ...process.env, 
      PATH: `${localBin}${path.delimiter}${process.env.PATH}` 
    };

    const child = exec(cmd, { 
      cwd, 
      env: combinedEnv,
      maxBuffer: 1024 * 1024 * 60, // Increase buffer
      shell: isWindows ? "cmd.exe" : "/bin/sh" 
    });

    let output = "";

    child.stdout.on("data", async (data) => {
      output += data.toString();
      const lines = data.toString().trim().split("\n");
      for (const line of lines) {
        if (line.trim()) {
          await saveLog(line.trim(), "info");
        }
      }
    });

    child.stderr.on("data", async (data) => {
      const lines = data.toString().trim().split("\n");
      for (const line of lines) {
        if (line.trim()) {
          await saveLog(line.trim(), "warn");
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

  const saveLog = async (message, level = "info", stage = "prep") => {
    // ⚡ STREAM (Live)
    eventBus.dispatch("deploy:log", { deploymentId, level, message, stage });
    
    // 💾 PERSIST (Database)
    try {
      await Deployment.findByIdAndUpdate(deploymentId, {
        $push: { logs: { message, level, stage, timestamp: new Date() } }
      });
    } catch (err) {
      /* non-critical database log failure */
    }
  };

  // 💎 CLOUD-NATIVE ISOLATION: OS-Agnostic absolute path
  const baseDir = isWindows ? "C:\\DN_Builds" : "/tmp/DN_Builds";
  const deployDir = path.join(baseDir, "deployments", `${project.name}-${uuidv4().substring(0, 8)}`);

  try {
    // Ensure absolute infrastructure exists
    if (!fs.existsSync(baseDir)) {
      try {
        fs.mkdirSync(baseDir, { recursive: true });
      } catch (err) {
        // Fallback to a secondary root if main root is restricted
        const fallbackBase = isWindows ? "C:\\DeployNova_Infrastructure" : "./deployments";
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

    await saveLog(`🖥️  SYSTEM HEALTH: ${cpuCount} Cores | ${freeMem}GB/${totalMem}GB RAM Available (${os.platform()})`, "info", "prep");
    await saveLog(`🚀 INFRASTRUCTURE: Cloud-Ready Isolated at ${baseDir}`, "info", "prep");

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
    /**
     * 🕵️‍♂️ RECURSIVE DISCOVERY ENGINE
     * Crawls subfolders to find the project's brain (package.json)
     */
    const findPackageJson = (currentDir, depth = 0) => {
      if (depth > 2) return null; // Max 3 levels deep (Standard for most monorepos)
      
      const pkgPath = path.join(currentDir, "package.json");
      if (fs.existsSync(pkgPath)) return currentDir;

      try {
        const items = fs.readdirSync(currentDir, { withFileTypes: true });
        // Prioritize common paths (client, server, web, apps, backend)
        const priorityPatterns = ["client", "server", "web", "apps", "backend", "api", "frontend"];
        const subs = items
          .filter(item => item.isDirectory() && !item.name.startsWith(".") && item.name !== "node_modules")
          .sort((a, b) => {
            const aIndex = priorityPatterns.indexOf(a.name.toLowerCase());
            const bIndex = priorityPatterns.indexOf(b.name.toLowerCase());
            if (aIndex !== -1 && bIndex === -1) return -1;
            if (aIndex === -1 && bIndex !== -1) return 1;
            return 0;
          });

        for (const sub of subs) {
          const res = findPackageJson(path.join(currentDir, sub.name), depth + 1);
          if (res) return res;
        }
      } catch { /* Silent fail for file-system permission gaps */ }
      return null;
    };

    let buildRoot = deployDir;
    
    // 🎯 PRIORITY 1: Explicit Root Metadata (Lock-in)
    const explicitRoot = project.rootDirectory || project.envVars?.get("ROOT_DIRECTORY") || project.envVars?.get("ROOT_DIR");
    
    if (explicitRoot) {
      const targetPath = path.join(deployDir, explicitRoot);
      if (fs.existsSync(path.join(targetPath, "package.json"))) {
        buildRoot = targetPath;
        await saveLog(`🎯 Explicit Override: Building from /${explicitRoot}`, "info", "discovery");
      } else {
        await saveLog(`⚠️ Warning: Custom root /${explicitRoot} exists but has no package.json. Attempting discovery...`, "warn", "discovery");
        buildRoot = findPackageJson(deployDir) || deployDir;
      }
    } else {
      // 🕵️ PRIORITY 2: Intelligent Deep Discovery
      const discoveredPath = findPackageJson(deployDir);
      if (discoveredPath && discoveredPath !== deployDir) {
        buildRoot = discoveredPath;
        const relativePath = path.relative(deployDir, discoveredPath);
        await saveLog(`🔍 Deep Discovery: Detected Project in /${relativePath}`, "info", "discovery");
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

    /**
     * 🏗️ GLOBAL ECOSYSTEM DETECTION
     * Check if this sub-project belongs to a larger Monorepo Hub.
     * If so, we must install the Hub first to link shared dependencies.
     */
    let hubRoot = null;
    let isMonorepoNative = false;
    let currentCheck = path.dirname(buildRoot);
    while (currentCheck.startsWith(deployDir) && currentCheck !== deployDir) {
      if (fs.existsSync(path.join(currentCheck, "package.json"))) {
        hubRoot = currentCheck;
        break;
      }
      currentCheck = path.dirname(currentCheck);
    }
    // Final fallback: Check the deployDir itself if buildRoot is nested
    if (!hubRoot && buildRoot !== deployDir && fs.existsSync(path.join(deployDir, "package.json"))) {
      hubRoot = deployDir;
    }

    if (hubRoot) {
      const hubName = path.relative(deployDir, hubRoot) || "root";
      const hubPkgPath = path.join(hubRoot, "package.json");
      let installCmd = "npm install --prefer-offline --no-audit --no-fund";
      
      // 🕵️ SMART SCRIPT DETECTOR: Look for "install-all", "setup", or "init"
      try {
        if (fs.existsSync(hubPkgPath)) {
          const hubPkg = JSON.parse(fs.readFileSync(hubPkgPath, "utf8"));
          const scripts = hubPkg.scripts || {};
          if (scripts["install-all"]) {
            installCmd = "npm run install-all";
            isMonorepoNative = true;
          } else if (scripts["setup"]) {
            installCmd = "npm run setup";
            isMonorepoNative = true;
          } else if (scripts["init"]) {
            installCmd = "npm run init";
            isMonorepoNative = true;
          }
        }
      } catch (err) { /* silent parse fail */ }

      await saveLog(`🏗️ Ecosystem Detected: Linking Global Infrastructure at /${hubName} via '${installCmd}'...`, "info", "install");
      if (isMonorepoNative) await saveLog("🛡️ Monorepo Native Mode: Disabling Symlink optimizations for Zero-Conflict build.", "info", "install");
      
      await runCommand(installCmd, hubRoot, deploymentId, "install");
      
      await saveLog("✅ Global Infrastructure linked", "success", "install");
    }

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
      let isCacheValid = false;
      if (!isMonorepoNative && newFingerprint && newFingerprint === oldFingerprint) {
        // 🧪 Sanity Check: Ensure cache isn't hollow/corrupted
        const sanityCheckFile = path.join(cacheModules, "dotenv");
        const expressCheckFile = path.join(cacheModules, "express");
        if (fs.existsSync(sanityCheckFile) || fs.existsSync(expressCheckFile)) {
          isCacheValid = true;
        }
      }

      if (isCacheValid) {
        eventBus.dispatch("deploy:log", {
          deploymentId,
          level: "success",
          message: "⚡ Zero-Install: Dependencies verified and active. Bypassing install stage.",
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
        // Dependencies changed, cache is first-time, or cache was hollow
        eventBus.dispatch("deploy:log", {
          deploymentId,
          level: "info",
          message: oldFingerprint
            ? "🔄 Dependencies updated or cache incomplete. Re-installing for perfection..."
            : "📦 Fresh install starting...",
          stage: "install",
        });

        // 🛡️ RECOVERY-ENABLED INSTALL
        try {
          // 1. Try Junction Route (Skip if Monorepo Native to avoid linked conflicts)
          if (!isMonorepoNative) {
            try {
              if (fs.existsSync(targetModules)) {
                try { fs.rmSync(targetModules, { recursive: true, force: true }); } catch (rmErr) { /* ignore */ }
              }
              // 🧪 Platform-Aware linking (dir for linux/mac, junction for windows)
              const linkType = os.platform() === "win32" ? "junction" : "dir";
              fs.symlinkSync(cacheModules, targetModules, linkType);
            } catch (linkErr) {
              await saveLog(`⚠️ Link Warning: ${linkErr.message}. Proceeding to direct install.`, "warn", "install");
            }
          }

          // 2. Perform Install (Full Spectrum for Build)
          await runCommand(
            "npm install --prefer-offline --no-audit --no-fund",
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
            "npm install --prefer-offline --no-audit --no-fund",
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

      let buildCmd = project.customBuildCmd || "npm run build";
      // 🛡️ NPX GUARD: If build cmd is just "vite build" or "npm run build", wrap it if it fails
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
    
    // Intelligent starting detection (Node vs Static)
    let startCmd = project.customStartCmd;
    let isStatic = false;
    let staticPath = "";

    if (!startCmd) {
      if (fs.existsSync(path.join(buildRoot, "server.js"))) {
        startCmd = "node server.js";
      } else if (fs.existsSync(path.join(buildRoot, "index.js"))) {
        startCmd = "node index.js";
      } else {
        // 🧪 STATIC FRONTEND DETECTION
        const distPaths = ["dist", "build", "out", "public"];
        for (const dp of distPaths) {
          if (fs.existsSync(path.join(buildRoot, dp))) {
            isStatic = true;
            staticPath = path.join(buildRoot, dp);
            eventBus.dispatch("deploy:log", {
              deploymentId,
              level: "info",
              message: `🚀 Static Hosting: Detected build folder at /${dp}`,
              stage: "start",
            });
            break;
          }
        }

        if (!isStatic) startCmd = "npm start";
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

    let appProcess;

    if (isStatic) {
      // 🌐 SPA STATIC SERVER (Pure Node - Zero Dependencies - ESM Bypass)
      const serverPath = path.join(buildRoot, ".dn_static_server.cjs");
      const dirPath = path.resolve(staticPath);
      
      const serverCode = `
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = ${port};
const dir = path.resolve(__dirname, '${path.relative(buildRoot, dirPath).replace(/\\/g, "/")}');

/**
 * Super-fast Pure Node SPA Server
 * Handles 15+ MIME types and SPA fallback routing
 */
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(dir, req.url === '/' ? 'index.html' : req.url);
  
  // 🛡️ SPA ROUTING: Redirect unknown paths to index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(dir, 'index.html');
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(500);
      res.end('Error: ' + error.code);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(port, () => console.log('🚀 Static server running on port', port));
      `.trim();

      fs.writeFileSync(serverPath, serverCode);
      
      appProcess = spawn("node", [".dn_static_server.cjs"], {
        cwd: buildRoot,
        env,
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      });
    } else {
      // 🚀 STANDARD NODE START
      const parts = startCmd.split(" ");
      appProcess = spawn(parts[0], parts.slice(1), {
        cwd: buildRoot,
        env,
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      });
    }

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
    const baseUrl = process.env.AUTO_DEV_OPS_URL || "http://localhost:5000";
    const url = `${baseUrl}/proxy/${port}/`;

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
