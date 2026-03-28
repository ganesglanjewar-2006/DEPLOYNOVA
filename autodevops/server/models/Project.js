// ═══════════════════════════════════════════════════
// 🚀 DeployNova — Project Model
// ═══════════════════════════════════════════════════
const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [2, "Project name must be at least 2 characters"],
      maxlength: [100, "Project name cannot exceed 100 characters"],
    },
    repoUrl: {
      type: String,
      required: [true, "Repository URL is required"],
      trim: true,
      match: [
        /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/,
        "Please provide a valid GitHub repository URL",
      ],
    },
    framework: {
      type: String,
      enum: ["react", "next", "vue", "node", "static", "other"],
      default: "node",
    },
    branch: {
      type: String,
      default: "main",
      trim: true,
    },
    customBuildCmd: {
      type: String,
      default: null,
      trim: true,
    },
    customStartCmd: {
      type: String,
      default: null,
      trim: true,
    },
    envVars: {
      type: Map,
      of: String,
      default: {},
    },
    status: {
      type: String,
      enum: ["active", "archived", "deploying"],
      default: "active",
    },
    lastDeployedAt: {
      type: Date,
      default: null,
    },
    deployCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ── Compound index for fast user queries ──
projectSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Project", projectSchema);