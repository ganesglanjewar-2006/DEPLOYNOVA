import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProjects, createProject, deleteProject } from "../api/projectApi";
import { triggerDeploy } from "../api/deployApi";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import { HiOutlinePlus, HiOutlineRocketLaunch, HiOutlineTrash, HiOutlineEye } from "react-icons/hi2";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [deploying, setDeploying] = useState(null);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", repoUrl: "", framework: "node", branch: "main",
    customBuildCmd: "", customStartCmd: "",
  });

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    try {
      const { data } = await getProjects();
      setProjects(data.projects);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    try {
      const payload = { ...form };
      if (!payload.customBuildCmd) delete payload.customBuildCmd;
      if (!payload.customStartCmd) delete payload.customStartCmd;
      await createProject(payload);
      setShowModal(false);
      setForm({ name: "", repoUrl: "", framework: "node", branch: "main", customBuildCmd: "", customStartCmd: "" });
      loadProjects();
    } catch (err) {
      setFormError(err.response?.data?.error || err.response?.data?.details?.join(", ") || "Failed to create project");
    }
  }

  async function handleDeploy(projectId) {
    setDeploying(projectId);
    try {
      const { data } = await triggerDeploy(projectId);
      navigate(`/deploy/${data.deployment.id}`);
    } catch (err) {
      alert(err.response?.data?.error || "Deploy failed");
    } finally {
      setDeploying(null);
    }
  }

  async function handleDelete(projectId, name) {
    if (!window.confirm(`Delete project "${name}" and all deployments?`)) return;
    try {
      await deleteProject(projectId);
      loadProjects();
    } catch (err) {
      alert(err.response?.data?.error || "Delete failed");
    }
  }

  const frameworkIcons = { react: "⚛️", next: "▲", vue: "💚", node: "🟢", static: "📄", other: "📦" };

  if (loading) return <div className="page-loader"><div className="loader-spinner" /><p>Loading projects...</p></div>;

  return (
    <div className="page projects-page">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <HiOutlinePlus /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state-large">
          <HiOutlineRocketLaunch className="empty-icon" />
          <h2>No projects yet</h2>
          <p>Create your first project to start deploying</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <HiOutlinePlus /> Create Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <div key={project._id} className="project-card">
              <div className="project-card-header">
                <span className="project-framework-icon">{frameworkIcons[project.framework] || "📦"}</span>
                <StatusBadge status={project.lastDeployment?.status || project.status} />
              </div>
              <h3 className="project-card-name">{project.name}</h3>
              <p className="project-card-repo">{project.repoUrl.replace("https://github.com/", "")}</p>
              <div className="project-card-meta">
                <span>{project.framework}</span>
                <span>·</span>
                <span>{project.branch}</span>
                <span>·</span>
                <span>{project.deployCount || 0} deploys</span>
              </div>
              {project.lastDeployment?.url && (
                <a href={project.lastDeployment.url} target="_blank" rel="noopener noreferrer" className="project-card-url">
                  {project.lastDeployment.url}
                </a>
              )}
              <div className="project-card-actions">
                <button className="btn btn-sm btn-success" onClick={() => handleDeploy(project._id)} disabled={deploying === project._id}>
                  <HiOutlineRocketLaunch /> {deploying === project._id ? "Deploying..." : "Deploy"}
                </button>
                <Link to={`/projects/${project._id}`} className="btn btn-sm btn-ghost">
                  <HiOutlineEye /> View
                </Link>
                <button className="btn btn-sm btn-danger-ghost" onClick={() => handleDelete(project._id, project.name)}>
                  <HiOutlineTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Project">
        <form className="modal-form" onSubmit={handleCreate}>
          {formError && <div className="auth-error">{formError}</div>}
          <div className="form-group">
            <label>Project Name</label>
            <input type="text" placeholder="My Portfolio" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>GitHub Repository URL</label>
            <input type="url" placeholder="https://github.com/user/repo" value={form.repoUrl} onChange={(e) => setForm({ ...form, repoUrl: e.target.value })} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Framework</label>
              <select value={form.framework} onChange={(e) => setForm({ ...form, framework: e.target.value })}>
                <option value="node">Node.js</option>
                <option value="react">React</option>
                <option value="next">Next.js</option>
                <option value="vue">Vue</option>
                <option value="static">Static</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Branch</label>
              <input type="text" placeholder="main" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Custom Build Command <span className="form-optional">(optional)</span></label>
            <input type="text" placeholder="npm run build" value={form.customBuildCmd} onChange={(e) => setForm({ ...form, customBuildCmd: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Custom Start Command <span className="form-optional">(optional)</span></label>
            <input type="text" placeholder="npm start" value={form.customStartCmd} onChange={(e) => setForm({ ...form, customStartCmd: e.target.value })} />
          </div>
          <button className="btn btn-primary btn-full" type="submit">Create Project</button>
        </form>
      </Modal>
    </div>
  );
}
