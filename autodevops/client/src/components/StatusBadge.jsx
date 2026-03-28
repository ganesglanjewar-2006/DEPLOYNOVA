export default function StatusBadge({ status }) {
  const statusMap = {
    active: { label: "Active", className: "badge-success" },
    live: { label: "Live", className: "badge-success" },
    deploying: { label: "Deploying", className: "badge-warning" },
    queued: { label: "Queued", className: "badge-info" },
    cloning: { label: "Cloning", className: "badge-info" },
    installing: { label: "Installing", className: "badge-info" },
    building: { label: "Building", className: "badge-warning" },
    starting: { label: "Starting", className: "badge-warning" },
    failed: { label: "Failed", className: "badge-danger" },
    stopped: { label: "Stopped", className: "badge-muted" },
    archived: { label: "Archived", className: "badge-muted" },
  };

  const info = statusMap[status] || { label: status, className: "badge-muted" };

  return <span className={`status-badge ${info.className}`}>{info.label}</span>;
}
