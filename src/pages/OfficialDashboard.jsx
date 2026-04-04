import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import CaseCard from '../components/CaseCard';
import ActionModal from '../components/ActionModal';
import DepartmentPerformance from '../components/DepartmentPerformance';
import './OfficialDashboard.css';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/_/backend';
const FILTERS = ['All', 'Pending', 'In Progress', 'Resolved'];

export default function OfficialDashboard() {
  const [reports, setReports]         = useState([]);
  const [stats, setStats]             = useState(null);
  const [activeFilter, setFilter]     = useState('All');
  const [selectedReport, setSelected] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [toast, setToast]             = useState(null);
  const [resetting, setResetting]     = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = activeFilter !== 'All' ? `?status=${encodeURIComponent(activeFilter)}` : '';
      const res = await fetch(`${API_BASE}/api/reports/all${qs}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Fetch failed');
      setReports(data.reports);
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);


  const handleUpdated = (updatedReport) => {
    setReports((prev) =>
      prev.map((r) => (r.grievanceId === updatedReport.grievanceId ? updatedReport : r))
    );

    // Success Toast Logic
    if (updatedReport.status === 'Resolved') {
      const score = Math.floor(Math.random() * 200) + 50; // Mock impact score
      setToast({ score, txId: updatedReport.grievanceId.slice(-6) });
      setTimeout(() => setToast(null), 4000);
    }

    fetchReports();
  };

  const handleResetAll = async () => {
    if (!window.confirm('⚠️ Are you sure you want to delete ALL grievances? This cannot be undone.')) return;
    if (!window.confirm('This will permanently erase every record from the database. Confirm one more time.')) return;
    setResetting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/reset-grievances`, {
        method: 'DELETE',
        headers: { 'x-admin-secret': 'nagrik-admin-reset' },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Reset failed');
      alert(`✅ ${data.message}`);
      fetchReports();
    } catch (err) {
      alert(`❌ Reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  const filtered = reports;

  return (
    <div className="od-page">

      <header className="od-topbar">
        <div className="od-topbar-inner">
          <div className="od-logo">
            <img src="/logo.png" alt="Nagrik Setu Logo" className="h-8 w-8 object-contain brightness-0 invert" />
            <div>
              <span className="od-logo-name">Nagrik Setu</span>
              <span className="od-logo-role">Official Dashboard</span>
            </div>
          </div>
          <div className="od-topbar-actions">
            <span className="od-official-chip">👤 Dept. Official</span>
            <Link to="/" className="od-citizen-link">← Citizen Portal</Link>
          </div>
        </div>
      </header>

      <div className="od-layout">

        <aside className="od-sidebar">
          <p className="od-sidebar-title">Filter by Status</p>
          <nav className="od-sidebar-nav">
            {FILTERS.map((f) => (
              <button
                key={f}
                className={`od-filter-btn ${activeFilter === f ? 'od-filter-btn--active' : ''} od-filter-btn--${f.replace(' ', '').toLowerCase()}`}
                onClick={() => setFilter(f)}
              >
                <span className="od-filter-dot" />
                <span className="od-filter-label">{f}</span>
                {stats && f !== 'All' && (
                  <span className="od-filter-count">{stats[f] ?? 0}</span>
                )}
                {stats && f === 'All' && (
                  <span className="od-filter-count">{stats.total ?? 0}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="od-sidebar-divider" />


          <DepartmentPerformance stats={stats} />
        </aside>


        <main className="od-main">

          <div className="od-toolbar">
            <div>
              <h1 className="od-main-title">
                {activeFilter === 'All' ? 'All Grievances' : `${activeFilter} Cases`}
              </h1>
              <p className="od-main-sub">
                {loading ? 'Loading…' : `${filtered.length} case${filtered.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="od-refresh-btn" onClick={fetchReports} disabled={loading || resetting}>
                {loading ? '⟳ Loading…' : '⟳ Refresh'}
              </button>
              <button
                id="btn-reset-all-grievances"
                onClick={handleResetAll}
                disabled={loading || resetting}
                style={{
                  background: resetting ? '#555' : '#c0392b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontWeight: 600,
                  cursor: resetting ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  transition: 'background 0.2s',
                }}
              >
                {resetting ? '🗑 Resetting…' : '🗑 Reset All Data'}
              </button>
            </div>
          </div>


          {error && (
            <div className="od-error">
              ⚠️ {error}
              <button onClick={fetchReports} className="od-error-retry">Retry</button>
            </div>
          )}


          {loading && !error && (
            <div className="od-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="od-skeleton" />)}
            </div>
          )}


          {!loading && !error && filtered.length === 0 && (
            <div className="od-empty">
              <span className="od-empty-icon">📭</span>
              <h3>No cases found</h3>
              <p>There are no grievances with status "{activeFilter}" right now.</p>
            </div>
          )}


          {!loading && !error && filtered.length > 0 && (
            <div className="od-grid">
              {filtered.map((report) => (
                <CaseCard
                  key={report.grievanceId}
                  report={report}
                  onAction={(r) => setSelected(r)}
                />
              ))}
            </div>
          )}
        </main>
      </div>


      {selectedReport && (
        <ActionModal
          report={selectedReport}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}

      {/* Success Toast */}
      {toast && (
        <div className="od-success-toast">
          <div className="od-toast-icon">🏆</div>
          <div>
            <strong>Well Done!</strong> Case Resolved.
            <div className="od-toast-score">Civic Impact Score: +{toast.score}</div>
          </div>
        </div>
      )}
    </div>
  );
}

