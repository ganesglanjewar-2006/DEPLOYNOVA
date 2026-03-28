// ═══════════════════════════════════════════════════
// 🚀 DeployNova — Event Bus (EventEmitter Pattern)
// ═══════════════════════════════════════════════════
const EventEmitter = require("events");

/**
 * Central event bus for the DeployNova system.
 * All modules can emit and listen to events through this single bus.
 *
 * Events:
 *   deploy:queued      { deploymentId, projectId, userId }
 *   deploy:stage       { deploymentId, stage, message }
 *   deploy:log         { deploymentId, level, message, stage }
 *   deploy:progress    { deploymentId, status, percentage }
 *   deploy:complete    { deploymentId, url, port, buildDuration }
 *   deploy:failed      { deploymentId, error, stage }
 *   project:created    { projectId, userId }
 *   project:deleted    { projectId, userId }
 *   github:push        { repoUrl, branch, commitHash }
 */
class DeployNovaEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    console.log("[EventBus] 🟢 DeployNova Event Bus initialized");
  }

  /**
   * Emit and log an event (convenience wrapper)
   */
  dispatch(event, payload) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[EventBus] ⚡ ${event}`, JSON.stringify(payload).substring(0, 120));
    }
    this.emit(event, payload);
  }
}

// Singleton — shared across the entire app
const eventBus = new DeployNovaEventBus();

module.exports = eventBus;
