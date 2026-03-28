import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { updateGithubToken } from "../api/authApi";
import { HiOutlineCog6Tooth, HiOutlineCheck } from "react-icons/hi2";

export default function SettingsPage() {
  const { user } = useAuth();
  const [githubToken, setGithubToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSaveToken(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateGithubToken({ githubToken });
      setSaved(true);
      setGithubToken("");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save token");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page settings-page">
      <div className="page-header">
        <div>
          <h1><HiOutlineCog6Tooth /> Settings</h1>
          <p className="page-subtitle">Configure your DeployNova account</p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="card">
        <div className="card-header"><h3>Profile</h3></div>
        <div className="card-body">
          <div className="settings-profile">
            <div className="settings-avatar">{user?.name?.charAt(0)}</div>
            <div>
              <p className="settings-name">{user?.name}</p>
              <p className="settings-email">{user?.email}</p>
              <p className="settings-role">Role: {user?.role}</p>
              <p className="settings-joined">Joined: {new Date(user?.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Integration */}
      <div className="card" style={{ marginTop: "1.5rem" }}>
        <div className="card-header"><h3>GitHub Integration</h3></div>
        <div className="card-body">
          <p className="settings-desc">
            Connect your GitHub Personal Access Token to list repositories and enable auto-deploy on push.
          </p>
          <p className="settings-status">
            Current status: {user?.githubToken ? <span className="text-success">✅ Connected</span> : <span className="text-danger">❌ Not connected</span>}
          </p>
          <form className="settings-form" onSubmit={handleSaveToken}>
            {error && <div className="auth-error">{error}</div>}
            {saved && <div className="auth-success"><HiOutlineCheck /> Token saved successfully!</div>}
            <div className="form-group">
              <label>GitHub Personal Access Token</label>
              <input type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} required />
              <p className="form-help">
                Generate a token at{" "}
                <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">github.com/settings/tokens</a>
                {" "}with repo access.
              </p>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Token"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
