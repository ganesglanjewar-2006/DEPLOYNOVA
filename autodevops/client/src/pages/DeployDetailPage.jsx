import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getDeployment, getDeploymentLogs, stopDeployment } from "../api/deployApi";
import { useSocket } from "../hooks/useSocket";
import DeployLogViewer from "../components/DeployLogViewer";
import StatusBadge from "../components/StatusBadge";
import { HiOutlineArrowLeft, HiOutlineStopCircle, HiOutlineClock, HiOutlineLink } from "react-icons/hi2";

export default function DeployDetailPage() {
  const { deploymentId } = useParams();
  const { deployEvents } = useSocket();
  const [deployment, setDeployment] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDeployment = useCallback(async () => {
    try {
      const { data } = await getDeployment(deploymentId);
      setDeployment(data.deployment);
      setLogs(data.deployment.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [deploymentId]);

  useEffect(() => {
    loadDeployment();
  }, [loadDeployment]);

  // Live updates from Socket.io
  useEffect(() => {
    const relevant = deployEvents.filter((e) => e.data.deploymentId === deploymentId);
    if (relevant.length > 0) {
      // Refresh from server to get latest state
      loadDeployment();
    }
  }, [deployEvents, deploymentId, loadDeployment]);

  // Also poll logs every 3s if deployment is in progress
  useEffect(() => {
    if (!deployment) return;
    const active = ["queued", "cloning", "installing", "building", "starting"].includes(deployment.status);
    if (!active) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await getDeploymentLogs(deploymentId);
        setLogs(data.logs || []);
        if (!["queued", "cloning", "installing", "building", "starting"].includes(data.status)) {
          loadDeployment(); // final refresh
          clearInterval(interval);
        }
      } catch (err) {
        console.error(err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [deployment?.status, deploymentId, loadDeployment]);

  async function handleStop() {
    if (!window.confirm("Stop this deployment?")) return;
    try {
      await stopDeployment(deploymentId);
      loadDeployment();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to stop");
    }
  }

  const isActive = deployment && ["queued", "cloning", "installing", "building", "starting"].includes(deployment.status);

  function formatDuration(ms) {
    if (!ms) return "—";
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  const stages = ["queued", "cloning", "installing", "building", "starting", "live"];
  const currentIndex = stages.indexOf(deployment?.status);

  if (loading) return <div className="page-loader"><div className="loader-spinner" /><p>Loading deployment...</p></div>;
  if (!deployment) return <div className="page"><h2>Deployment not found</h2></div>;

  return (
    <div className="page deploy-detail-page">
      <div className="page-header">
        <div>
          <Link to={deployment.projectId?._id ? `/projects/${deployment.projectId._id}` : "/projects"} className="back-link">
            <HiOutlineArrowLeft /> Back to Project
          </Link>
          <h1>Deployment Details</h1>
          <p className="page-subtitle">
            {deployment.projectId?.name || "Unknown Project"} · {deployment.branch || "main"}
          </p>
        </div>
        {isActive && (
          <button className="btn btn-danger" onClick={handleStop}>
            <HiOutlineStopCircle /> Stop
          </button>
        )}
      </div>

      {/* Stage Progress */}
      <div className="deploy-progress">
        {stages.map((stage, i) => (
          <div key={stage} className={`progress-step ${i <= currentIndex ? "step-done" : ""} ${i === currentIndex && isActive ? "step-active" : ""} ${deployment.status === "failed" && i === currentIndex ? "step-failed" : ""}`}>
            <div className="progress-dot" />
            <span className="progress-label">{stage}</span>
          </div>
        ))}
      </div>

      {/* Info Cards */}
      <div className="deploy-info-grid">
        <div className="deploy-info-card">
          <span className="deploy-info-label">Status</span>
          <StatusBadge status={deployment.status} />
        </div>
        <div className="deploy-info-card">
          <span className="deploy-info-label">Triggered By</span>
          <span className="deploy-info-value">{deployment.triggeredBy}</span>
        </div>
        <div className="deploy-info-card">
          <span className="deploy-info-label"><HiOutlineClock /> Duration</span>
          <span className="deploy-info-value">{formatDuration(deployment.buildDuration)}</span>
        </div>
        <div className="deploy-info-card">
          <span className="deploy-info-label"><HiOutlineLink /> URL</span>
          {deployment.url ? (
            <a href={deployment.url} target="_blank" rel="noopener noreferrer" className="deploy-info-link">{deployment.url}</a>
          ) : (
            <span className="deploy-info-value">—</span>
          )}
        </div>
      </div>

      {/* Log Viewer */}
      <DeployLogViewer logs={logs} status={deployment.status} />

      {/* Meta */}
      <div className="deploy-meta">
        <span>Commit: <code>{deployment.commitHash || "—"}</code></span>
        <span>Started: {new Date(deployment.createdAt).toLocaleString()}</span>
        <span>ID: <code>{deployment._id}</code></span>
      </div>
    </div>
  );
}
