// ═══════════════════════════════════════════════════════════════════════════
//
//   ██████╗ ███████╗██████╗ ██╗      ██████╗ ██╗   ██╗  ███╗   ██╗ ██████╗ ██╗   ██╗ █████╗
//   ██╔══██╗██╔════╝██╔══██╗██║     ██╔═══██╗╚██╗ ██╔╝  ████╗  ██║██╔═══██╗██║   ██║██╔══██╗
//   ██║  ██║█████╗  ██████╔╝██║     ██║   ██║ ╚████╔╝   ██╔██╗ ██║██║   ██║██║   ██║███████║
//   ██║  ██║██╔══╝  ██╔═══╝ ██║     ██║   ██║  ╚██╔╝    ██║╚██╗██║██║   ██║╚██╗ ██╔╝██╔══██║
//   ██████╔╝███████╗██║     ███████╗╚██████╔╝   ██║     ██║ ╚████║╚██████╔╝ ╚████╔╝ ██║  ██║
//   ╚═════╝ ╚══════╝╚═╝     ╚══════╝ ╚═════╝    ╚═╝     ╚═╝  ╚═══╝ ╚═════╝   ╚═══╝  ╚═╝  ╚═╝
//
//   🚀 AutoDevOps Deployment Platform — Server Entry Point
//
// ═══════════════════════════════════════════════════════════════════════════

require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");

// ── Event System ──
const eventBus = require("./events/eventBus");
const registerDeployListeners = require("./events/deployListeners");

// ── Middleware ──
const errorHandler = require("./middleware/errorHandler");

// ── Route Modules ──
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const deployRoutes = require("./routes/deployRoutes");
const githubRoutes = require("./routes/githubRoutes");

// ═══════════════════════════════════════════════════
// App Initialization
// ═══════════════════════════════════════════════════
const app = express();
const server = http.createServer(app);

// ── Socket.io Setup ──
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Make io accessible to services
app.set("io", io);

// ═══════════════════════════════════════════════════
// Global Middleware
// ═══════════════════════════════════════════════════
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logger (development only)
if (process.env.NODE_ENV === "development") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// ═══════════════════════════════════════════════════
// API Routes
// ═══════════════════════════════════════════════════
app.get("/", (_req, res) => {
  res.json({
    name: "DeployNova",
    tagline: "🚀 AutoDevOps Deployment Platform",
    version: "1.0.0",
    status: "operational",
    docs: {
      auth: "/api/auth",
      projects: "/api/projects",
      deploy: "/api/deploy",
      github: "/api/github",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/deploy", deployRoutes);
app.use("/api/github", githubRoutes);

// ── Health Check ──
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    mongoState: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// ── 404 Handler ──
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// ── Global Error Handler ──
app.use(errorHandler);

// ═══════════════════════════════════════════════════
// Socket.io Connection
// ═══════════════════════════════════════════════════
io.on("connection", (socket) => {
  console.log(`[Socket.io] 🔌 Client connected: ${socket.id}`);

  // User joins their personal room for real-time updates
  socket.on("join", (userId) => {
    socket.join(`user:${userId}`);
    console.log(`[Socket.io] 👤 User ${userId} joined room`);
  });

  // Join specific deployment log stream
  socket.on("watch:deployment", (deploymentId) => {
    socket.join(`deploy:${deploymentId}`);
    console.log(`[Socket.io] 👁 Watching deployment: ${deploymentId}`);
  });

  socket.on("disconnect", () => {
    console.log(`[Socket.io] ❌ Client disconnected: ${socket.id}`);
  });
});

// ═══════════════════════════════════════════════════
// Register Event Listeners
// ═══════════════════════════════════════════════════
registerDeployListeners(io);

// ═══════════════════════════════════════════════════
// Database Connection & Server Start
// ═══════════════════════════════════════════════════
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("═══════════════════════════════════════════════════");
    console.log("  🟢 MongoDB Connected Successfully");
    console.log("═══════════════════════════════════════════════════");

    // 🧹 STARTUP CLEANUP & SANITY CHECKS (Monorepo Resilience)
    const Deployment = require("./models/Deployment");
    const Project = require("./models/Project");

    const startupAudit = async () => {
      try {
        // 1. Clear Ghost Deployments
        const ghostResult = await Deployment.updateMany(
          { status: { $in: ["cloning", "installing", "starting"] } },
          { status: "failed" }
        );
        if (ghostResult.modifiedCount > 0) {
          console.log(`[🚀 DeployNova] 🧹 Cleared ${ghostResult.modifiedCount} ghost deployments.`);
        }

        // 2. Patch Monorepo Projects (Deep Thinking Perfection)
        const monorepoPatch = await Project.updateMany(
          { name: { $in: [/NEXUS/i, /CapitalVue/i] } },
          { 
            rootDirectory: "fin-nexus/backend",
            customStartCmd: "npm start"
          }
        );
        if (monorepoPatch.modifiedCount > 0) {
          console.log(`[🚀 DeployNova] 💎 Auto-Patched ${monorepoPatch.modifiedCount} monorepo projects for resilience.`);
        }
      } catch (err) {
        console.error("[🚀 DeployNova] ⚠️ Startup audit failed:", err);
      }
    };
    startupAudit();

    server.listen(PORT, () => {
      console.log("");
      console.log("  🚀 DeployNova is LIVE!");
      console.log(`  🌐 Server:  http://localhost:${PORT}`);
      console.log(`  📡 API:     http://localhost:${PORT}/api`);
      console.log(`  🔌 Socket:  ws://localhost:${PORT}`);
      console.log(`  🛠  Mode:    ${process.env.NODE_ENV || "development"}`);
      console.log("");
      console.log("═══════════════════════════════════════════════════");
    });
  })
  .catch((err) => {
    console.error("═══════════════════════════════════════════════════");
    console.error("  ❌ MongoDB Connection Failed:", err.message);
    console.error("═══════════════════════════════════════════════════");
    process.exit(1);
  });

// ── Graceful Shutdown ──
process.on("SIGTERM", () => {
  console.log("\n[DeployNova] 🛑 SIGTERM received — shutting down gracefully...");
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log("[DeployNova] 🟡 MongoDB disconnected");
      process.exit(0);
    });
  });
});

module.exports = { app, server, io };