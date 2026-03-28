import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { HiOutlineRocketLaunch } from "react-icons/hi2";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await registerUser(form);
      login(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.join(", ") || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <HiOutlineRocketLaunch className="auth-brand-icon" />
          <h1>DeployNova</h1>
          <p className="auth-tagline">AutoDevOps Deployment Platform</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Create your account</h2>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input id="name" type="text" placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
