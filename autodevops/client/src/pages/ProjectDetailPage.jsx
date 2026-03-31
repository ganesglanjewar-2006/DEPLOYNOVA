import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getProject, deleteProject } from "../api/projectApi";
import { getDeployments, triggerDeploy } from "../api/deployApi";
import StatusBadge from "../components/StatusBadge";
import { HiOutlineArrowLeft, HiOutlineRocketLaunch, HiOutlineTrash, HiOutlineClock, HiOutlineLink } from "react-icons/hi2";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => { load(); }, [projectId]);

  async function load() {
    try {
      const [projRes, depRes] = await Promise.all([
        getProject(projectId),
        getDeployments(projectId),
      ]);
      setProject(projRes.data.project);
      setDeployments(depRes.data.deployments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeploy() {
    setDeploying(true);
    try {
      const { data } = await triggerDeploy(projectId);
      navigate(`/deploy/${data.deployment.id}`);
    } catch (err) {
      alert(err.response?.data?.error || "Deploy failed");
    } finally {
      setDeploying(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${project.name}" and all deployments?`)) return;
    try {
      await deleteProject(projectId);
      navigate("/projects");
    } catch (err) {
      alert(err.response?.data?.error || "Delete failed");
    }
  }

  function formatDuration(ms) {
    if (!ms) return "—";
    const s = Math.floor(ms / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  if (loading) return <div className="page-loader"><div className="loader-spinner" /><p>Loading project...</p></div>;
  if (!project) return <div className="page"><h2>Project not found</h2></div>;

  return (
    <div className="page project-detail-page">
      <div className="page-header">
        <div>
          <Link to="/projects" className="back-link"><HiOutlineArrowLeft /> Back to Projects</Link>
          <h1>{project.name}</h1>
          <p className="page-subtitle">{project.repoUrl.replace("https://github.com/", "")}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-success" onClick={handleDeploy} disabled={deploying}>
            <HiOutlineRocketLaunch /> {deploying ? "Deploying..." : "Deploy Now"}
          </button>
          <button className="btn btn-danger-ghost" onClick={handleDelete}><HiOutlineTrash /> Delete</button>
        </div>
      </div>

      {/* Project Info */}
      <div className="deploy-info-grid">
        <div className="deploy-info-card">
          <span className="deploy-info-label">Framework</span>
          <span className="deploy-info-value">{project.framework}</span>
        </div>
        <div className="deploy-info-card">
          <span className="deploy-info-label">Branch</span>
          <span className="deploy-info-value">{project.branch}</span>
        </div>
        <div className="deploy-info-card">
          <span className="deploy-info-label">Root Directory</span>
          <span className="deploy-info-value">{project.rootDirectory || "(auto)" }</span>
        </div>
        <div className="deploy-info-card">
          <span className="deploy-info-label">Status</span>
          <StatusBadge status={project.status} />
        </div>
        <div className="deploy-info-card">
          <span className="deploy-info-label">Total Deploys</span>
          <span className="deploy-info-value">{project.deployCount || 0}</span>
        </div>
      </div>

      {/* Deployment History */}
      <div className="card" style={{ marginTop: "1.5rem" }}>
        <div className="card-header">
          <h3>Deployment History</h3>
        </div>
        <div className="card-body">
          {deployments.length === 0 ? (
            <div className="empty-state"><p>No deployments yet. Hit "Deploy Now" to start!</p></div>
          ) : (
            <div className="deploy-history-list">
              {deployments.map((dep) => (
                <div key={dep._id} className="deploy-history-item-container">
                  <Link to={`/deploy/${dep._id}`} className="deploy-history-item">
                    <div className="deploy-history-left">
                      <StatusBadge status={dep.status} />
                      <span className="deploy-history-trigger">{dep.triggeredBy}</span>
                    </div>
                    <div className="deploy-history-right">
                      {dep.buildDuration && (
                        <span className="deploy-history-duration"><HiOutlineClock /> {formatDuration(dep.buildDuration)}</span>
                      )}
                      <span className="deploy-history-time">{new Date(dep.createdAt).toLocaleString()}</span>
                    </div>
                  </Link>
                  {dep.url && dep.status === "live" && (
                    <div className="deploy-history-url-hover">
                      <a href={dep.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">
                        <HiOutlineLink /> Open App
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
