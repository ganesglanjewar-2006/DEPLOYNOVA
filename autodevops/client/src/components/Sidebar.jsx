import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HiOutlineHome, HiOutlineFolder, HiOutlineCog6Tooth, HiOutlineArrowRightOnRectangle, HiOutlineRocketLaunch, HiOutlineBolt } from "react-icons/hi2";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const links = [
    { to: "/", icon: <HiOutlineHome />, label: "Dashboard" },
    { to: "/projects", icon: <HiOutlineFolder />, label: "Projects" },
    { to: "/automation", icon: <HiOutlineBolt />, label: "Automation" },
    { to: "/settings", icon: <HiOutlineCog6Tooth />, label: "Settings" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <HiOutlineRocketLaunch className="sidebar-brand-icon" />
        <span>DeployNova</span>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === "/"} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <span className="sidebar-link-icon">{link.icon}</span>
            <span className="sidebar-link-label">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-info">
            <p className="sidebar-user-name">{user?.name}</p>
            <p className="sidebar-user-email">{user?.email}</p>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          <HiOutlineArrowRightOnRectangle />
        </button>
      </div>
    </aside>
  );
}
