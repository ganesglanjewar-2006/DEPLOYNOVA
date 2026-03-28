// ═══════════════════════════════════════════════════
// 🚀 DeployNova — Deployment Model
// ═══════════════════════════════════════════════════
const mongoose = require("mongoose");

const logEntrySchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ["info", "warn", "error", "success"], default: "info" },
    message: { type: String, required: true },
    stage: {
      type: String,
      enum: ["clone", "install", "build", "start", "cleanup", "system"],
      default: "system",
    },
  },
  { _id: false }
);

const deploymentSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "cloning", "installing", "building", "starting", "live", "failed", "stopped"],
      default: "queued",
    },
    logs: [logEntrySchema],
    url: {
      type: String,
      default: null,
    },
    port: {
      type: Number,
      default: null,
    },
    buildDuration: {
      type: Number, // milliseconds
      default: null,
    },
    commitHash: {
      type: String,
      default: null,
      trim: true,
    },
    branch: {
      type: String,
      default: "main",
    },
    triggeredBy: {
      type: String,
      enum: ["manual", "webhook", "lifeos", "cron"],
      default: "manual",
    },
    environment: {
      type: Map,
      of: String,
      default: {},
    },
    processId: {
      type: Number, // PID of the running app
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── Index for querying latest deployments ──
deploymentSchema.index({ projectId: 1, createdAt: -1 });
deploymentSchema.index({ status: 1 });

module.exports = mongoose.model("Deployment", deploymentSchema);