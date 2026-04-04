import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import CaseCard from '../components/CaseCard';
import ActionModal from '../components/ActionModal';
import DepartmentPerformance from '../components/DepartmentPerformance';
import './OfficialDashboard.css';

const API_BASE = 'http://localhost:5000';
const FILTERS = ['All', 'Pending', 'In Progress', 'Resolved'];

export default function OfficialDashboard() {
  const [reports, setReports]         = useState([]);
  const [stats, setStats]             = useState(null);
  const [activeFilter, setFilter]     = useState('All');
  const [selectedReport, setSelected] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

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

  // When an action is taken in the modal, update the card in-place + refresh stats
  const handleUpdated = (updatedReport) => {
    setReports((prev) =>
      prev.map((r) => (r.grievanceId === updatedReport.grievanceId ? updatedReport : r))
    );
    // Re-fetch to get fresh stats counts
    fetchReports();
  };

  const filtered = reports; // server already filters; kept for clarity

  return (
    <div className="od-page">
      {/* ── Top Navigation ── */}
      <header className="od-topbar">
        <div className="od-topbar-inner">
          <div className="od-logo">
            <span>🏛️</span>
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
        {/* ── Sidebar ── */}
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

          {/* Performance widget in sidebar */}
          <DepartmentPerformance stats={stats} />
        </aside>

        {/* ── Main content ── */}
        <main className="od-main">
          {/* Toolbar */}
          <div className="od-toolbar">
            <div>
              <h1 className="od-main-title">
                {activeFilter === 'All' ? 'All Grievances' : `${activeFilter} Cases`}
              </h1>
              <p className="od-main-sub">
                {loading ? 'Loading…' : `${filtered.length} case${filtered.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
            <button className="od-refresh-btn" onClick={fetchReports} disabled={loading}>
              {loading ? '⟳ Loading…' : '⟳ Refresh'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="od-error">
              ⚠️ {error}
              <button onClick={fetchReports} className="od-error-retry">Retry</button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && !error && (
            <div className="od-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="od-skeleton" />)}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div className="od-empty">
              <span className="od-empty-icon">📭</span>
              <h3>No cases found</h3>
              <p>There are no grievances with status "{activeFilter}" right now.</p>
            </div>
          )}

          {/* Cards grid */}
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

      {/* ── Action Modal ── */}
      {selectedReport && (
        <ActionModal
          report={selectedReport}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
