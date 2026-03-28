import React, { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlineBolt, HiOutlineClock, HiOutlineTrash, HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi2';
import ruleApi from '../api/ruleApi';
import * as projectApi from '../api/projectApi';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

export default function AutomationPage() {
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    projectId: '',
    cron: '*/5 * * * *', // Default 5 mins
    status: 'active'
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadLogs, 10000); // Refresh logs every 10s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rulesRes, logsRes, projectsRes] = await Promise.all([
        ruleApi.getRules(),
        ruleApi.getLogs(),
        projectApi.getProjects()
      ]);
      setRules(rulesRes.rules || []);
      setLogs(logsRes.logs || []);
      setProjects(projectsRes.projects || []);
    } catch (err) {
      console.error('Failed to load automation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await ruleApi.getLogs();
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to refresh logs:', err);
    }
  };

  const handleToggleStatus = async (rule) => {
    try {
      const newStatus = rule.status === 'active' ? 'inactive' : 'active';
      await ruleApi.updateRule(rule._id, { status: newStatus });
      setRules(rules.map(r => r._id === rule._id ? { ...r, status: newStatus } : r));
    } catch (err) {
      alert('Failed to update rule status');
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    try {
      await ruleApi.deleteRule(id);
      setRules(rules.filter(r => r._id !== id));
    } catch (err) {
      alert('Failed to delete rule');
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await ruleApi.createRule({
        name: formData.name,
        trigger: { type: 'cron', value: formData.cron },
        action: { type: 'deploy', targetId: formData.projectId },
        status: formData.status
      });
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create rule');
    }
  };

  if (loading) return <div className="loader-screen"><div className="loader-spinner"></div><p>Intelligence loading...</p></div>;

  return (
    <div className="page automation-page">
      <header className="page-header">
        <div className="page-title-area">
          <HiOutlineBolt className="page-icon" />
          <div>
            <h1>Automation Brain</h1>
            <p>Smart, scheduled deployments for your LifeOS ecosystem.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <HiOutlinePlus /> New Rule
        </button>
      </header>

      <section className="automation-grid">
        <div className="section-header">
          <h2>Active Rules</h2>
          <span className="badge">{rules.length} total</span>
        </div>

        {rules.length === 0 ? (
          <div className="empty-state-card">
            <HiOutlineBolt className="empty-icon" />
            <p>No automation rules yet.</p>
          </div>
        ) : (
          <div className="rule-cards-grid">
            {rules.map(rule => (
              <div key={rule._id} className={`rule-card ${rule.status}`}>
                <div className="rule-card-header">
                  <h3 className="rule-name">{rule.name}</h3>
                  <div className="rule-status-toggle">
                    <button 
                      className={`btn-toggle ${rule.status === 'active' ? 'on' : 'off'}`}
                      onClick={() => handleToggleStatus(rule)}
                    >
                      <div className="toggle-slider"></div>
                    </button>
                    <span className="toggle-label">{rule.status === 'active' ? 'Active' : 'Paused'}</span>
                  </div>
                </div>
                
                <div className="rule-details">
                  <div className="rule-meta">
                    <HiOutlineClock />
                    <span>{rule.trigger.value}</span>
                  </div>
                  <div className="rule-target">
                    <strong>Targets:</strong> {projects.find(p => p._id === rule.action.targetId)?.name || 'Unknown Project'}
                  </div>
                </div>

                <div className="rule-card-footer">
                  <div className="rule-last-run">
                    Last execution: {rule.lastExecuted ? new Date(rule.lastExecuted).toLocaleString() : 'Never'}
                  </div>
                  <button className="btn-icon btn-danger" onClick={() => handleDeleteRule(rule._id)}>
                    <HiOutlineTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="execution-logs-section">
        <div className="section-header">
          <h2>Recent Executions</h2>
        </div>
        <div className="card log-card">
          <table className="log-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Rule</th>
                <th>Message</th>
                <th>Duration</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan="5" className="text-center">No execution history found.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id}>
                    <td>
                      {log.status === 'success' ? 
                        <span className="status-indicator success"><HiOutlineCheckCircle /> Success</span> : 
                        <span className="status-indicator danger"><HiOutlineXCircle /> Failed</span>
                      }
                    </td>
                    <td>{log.ruleId?.name || 'Deleted Rule'}</td>
                    <td className="log-message-cell">{log.message}</td>
                    <td>{log.duration}ms</td>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* New Rule Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Automation Rule">
        <form onSubmit={handleCreateRule} className="modal-form">
          {error && <div className="alert alert-danger">{error}</div>}
          
          <div className="form-group">
            <label>Rule Name</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. Daily Production Deployment"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Target Project</label>
            <select 
              required
              value={formData.projectId}
              onChange={(e) => setFormData({...formData, projectId: e.target.value})}
            >
              <option value="">Select a project...</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Schedule (Cron)</label>
              <input 
                type="text" 
                required 
                placeholder="*/30 * * * *"
                value={formData.cron}
                onChange={(e) => setFormData({...formData, cron: e.target.value})}
              />
              <p className="form-help">Minute Hour Day Month Week (Standard Cron)</p>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Strategy</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
