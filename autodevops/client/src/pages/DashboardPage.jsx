import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProjects } from "../api/projectApi";
import { getRunningDeployments } from "../api/deployApi";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import StatusBadge from "../components/StatusBadge";
import { HiOutlineFolder, HiOutlineRocketLaunch, HiOutlineBolt, HiOutlineClock, HiOutlineSignal } from "react-icons/hi2";

export default function DashboardPage() {
  const { user } = useAuth();
  const { isConnected, deployEvents } = useSocket();
  const [projects, setProjects] = useState([]);
  const [running, setRunning] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Refresh on deploy events
  useEffect(() => {
    if (deployEvents.length > 0) {
      loadData();
    }
  }, [deployEvents.length]);

  async function loadData() {
    try {
      const [projRes, runRes] = await Promise.all([getProjects(), getRunningDeployments()]);
      setProjects(projRes.data.projects);
      setRunning(runRes.data.deployments);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }

  const totalProjects = projects.length;
  const liveDeployments = projects.filter((p) => p.lastDeployment?.status === "live").length;
  const recentActivity = deployEvents.slice(-5).reverse();

  if (loading) {
    return <div className="page-loader"><div className="loader-spinner" /><p>Loading dashboard...</p></div>;
  }

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <div>
          <h1>Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening with your deployments</p>
        </div>
        <div className="socket-status">
          <HiOutlineSignal className={isConnected ? "text-success" : "text-danger"} />
          <span>{isConnected ? "Live" : "Offline"}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-purple"><HiOutlineFolder /></div>
          <div className="stat-info">
            <p className="stat-value">{totalProjects}</p>
            <p className="stat-label">Total Projects</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><HiOutlineRocketLaunch /></div>
          <div className="stat-info">
            <p className="stat-value">{liveDeployments}</p>
            <p className="stat-label">Live Deployments</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-orange"><HiOutlineBolt /></div>
          <div className="stat-info">
            <p className="stat-value">{running.length}</p>
            <p className="stat-label">Running Now</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue"><HiOutlineClock /></div>
          <div className="stat-info">
            <p className="stat-value">{projects.reduce((sum, p) => sum + (p.deployCount || 0), 0)}</p>
            <p className="stat-label">Total Deploys</p>
          </div>
        </div>
      </div>

      {/* Projects + Activity */}
      <div className="dashboard-grid">
        {/* Recent Projects */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Projects</h3>
            <Link to="/projects" className="btn btn-sm btn-ghost">View All</Link>
          </div>
          <div className="card-body">
            {projects.length === 0 ? (
              <div className="empty-state">
                <p>No projects yet</p>
                <Link to="/projects" className="btn btn-sm btn-primary">Create First Project</Link>
              </div>
            ) : (
              <div className="project-list-mini">
                {projects.slice(0, 5).map((project) => (
                  <Link key={project._id} to={`/projects/${project._id}`} className="project-list-item">
                    <div className="project-list-item-info">
                      <p className="project-list-item-name">{project.name}</p>
                      <p className="project-list-item-meta">{project.framework} · {project.branch}</p>
                    </div>
                    <StatusBadge status={project.lastDeployment?.status || project.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card">
          <div className="card-header">
            <h3>Live Activity</h3>
            <span className={`live-dot ${isConnected ? "dot-live" : "dot-off"}`} />
          </div>
          <div className="card-body">
            {recentActivity.length === 0 ? (
              <div className="empty-state"><p>No recent activity</p></div>
            ) : (
              <div className="activity-feed">
                {recentActivity.map((ev, i) => (
                  <div key={i} className="activity-item">
                    <span className="activity-event">{ev.event.replace("deploy:", "")}</span>
                    <span className="activity-msg">{ev.data.message || ev.data.stage || ev.data.url || "—"}</span>
                    <span className="activity-time">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
