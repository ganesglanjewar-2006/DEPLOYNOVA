import { useEffect, useRef } from "react";

export default function DeployLogViewer({ logs = [], status }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const levelColors = {
    info: "log-info",
    warn: "log-warn",
    error: "log-error",
    success: "log-success",
  };

  return (
    <div className="log-viewer" ref={containerRef}>
      <div className="log-header">
        <span className="log-title">Terminal Output</span>
        <span className={`log-status-dot ${status === "live" ? "dot-live" : status === "failed" ? "dot-failed" : "dot-running"}`} />
        <span className="log-status-text">{status}</span>
      </div>
      <div className="log-body">
        {logs.length === 0 && <p className="log-empty">Waiting for logs...</p>}
        {logs.map((log, i) => (
          <div key={i} className={`log-entry ${levelColors[log.level] || ""}`}>
            <span className="log-time">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ""}</span>
            <span className="log-stage">[{log.stage || "sys"}]</span>
            <span className="log-msg">{log.message}</span>
          </div>
        ))}
        {["queued", "cloning", "installing", "building", "starting"].includes(status) && (
          <div className="log-entry log-cursor">
            <span className="cursor-blink">▊</span>
          </div>
        )}
      </div>
    </div>
  );
}
