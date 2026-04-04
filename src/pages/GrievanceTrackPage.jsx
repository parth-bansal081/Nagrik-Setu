import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './GrievanceTrackPage.css';

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : '/_/backend';

// ─── Stage Definitions ────────────────────────────────────────────────────────
const STAGES = [
  {
    key: 'submitted',
    name: 'Submitted',
    icon: '📋',
    desc: 'Your grievance has been received and logged in the system.',
    // always done once the report exists
    isDone: () => true,
  },
  {
    key: 'ai_verified',
    name: 'AI Verified',
    icon: '🤖',
    desc: 'Gemini AI has analyzed the photo, confirmed the issue, and auto-routed it to the correct department.',
    isDone: (r) => !!r.aiSummary,
  },
  {
    key: 'action_taken',
    name: 'Action Taken',
    icon: '🔧',
    desc: 'The assigned department official has started working on this issue.',
    isDone: (r) => ['In Progress', 'Resolved'].includes(r.status),
  },
  {
    key: 'resolved',
    name: 'Resolved',
    icon: '✅',
    desc: 'The issue has been fixed and closed. Thank you for reporting!',
    isDone: (r) => r.status === 'Resolved',
  },
];

function getSocialImpact(category) {
  switch (category) {
    case 'Water Supply': return 'Because of your report, 50 families now have clean water access again.';
    case 'Electricity':  return 'Your report helped restore power to hundreds of residents.';
    case 'Roads':        return 'Your report made this street 20% safer tonight.';
    default:             return 'Your civic participation has directly improved community well-being.';
  }
}

function getSeverityIcon(severity) {
  if (severity === 'High')   return '🔴';
  if (severity === 'Medium') return '🟠';
  if (severity === 'Low')    return '🟢';
  return '⚪';
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GrievanceTrackPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const pollRef = useRef(null);

  const fetchReport = async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/report/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Grievance not found');
      setReport(data.report);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch + polling every 30s
  useEffect(() => {
    fetchReport();
    pollRef.current = setInterval(fetchReport, 30000);
    return () => clearInterval(pollRef.current);
  }, [id]);

  const sendMood = async (mood) => {
    if (!report || report.status === 'Resolved') return;
    const res  = await fetch(`${API_BASE}/api/report/${report.grievanceId}/mood`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood }),
    });
    const data = await res.json();
    if (res.ok) setReport(data.report);
  };

  // ─── Active stage index ──────────────────────────────────────────────────
  const getActiveStage = (r) => {
    let last = 0;
    STAGES.forEach((s, i) => { if (s.isDone(r)) last = i; });
    return last;
  };

  // ─── Render: loading ─────────────────────────────────────────────────────
  if (loading) return (
    <div className="gtp-root">
      <TopBar />
      <div className="gtp-loading">
        <div className="gtp-spinner" />
        <p>Fetching your grievance…</p>
      </div>
    </div>
  );

  // ─── Render: error ───────────────────────────────────────────────────────
  if (error || !report) return (
    <div className="gtp-root">
      <TopBar />
      <div className="gtp-error-box">
        <div className="gtp-error-icon">😕</div>
        <h2>Grievance Not Found</h2>
        <p>{error || 'The ID you entered does not match any grievance in our system.'}</p>
        <Link to="/track" className="gtp-error-btn">← Go to Track Page</Link>
      </div>
    </div>
  );

  const activeIdx    = getActiveStage(report);
  const statusSlug   = report.status.replace(' ', '');
  const hasInsights  = report.aiSummary || report.aiSeverity || report.aiConfidence;

  return (
    <div className="gtp-root">
      <TopBar />

      {/* ── Hero ── */}
      <div className="gtp-hero">
        <div className="gtp-hero-eyebrow">
          <span>🏛️</span> Nagrik Setu · Live Grievance Tracker
        </div>
        <h1 className="gtp-hero-title">{report.category}</h1>
        <div className="gtp-hero-id">ID: {report.grievanceId}</div>
      </div>

      <div className="gtp-body">

        {/* ── Status Row ── */}
        <div className="gtp-status-row">
          <span className={`gtp-status-pill gtp-pill-${statusSlug}`}>
            ● {report.status}
          </span>
          {report.departmentName && (
            <span className="gtp-dept-tag">🏢 {report.departmentName}</span>
          )}
          {report.deadline && (
            <span className="gtp-deadline-tag">
              ⏰ Due: {new Date(report.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>

        {/* ── Smart Insights ── */}
        {hasInsights && (
          <div className="gtp-insights">
            <div className="gtp-insights-label">
              <span /> Smart Insights · Gemini AI Analysis
            </div>

            {report.aiSummary && (
              <p className="gtp-insights-summary">"{report.aiSummary}"</p>
            )}

            <div className="gtp-insights-meta">
              {report.aiSeverity && (
                <span className={`gtp-insight-chip gtp-chip-severity-${report.aiSeverity}`}>
                  {getSeverityIcon(report.aiSeverity)} Severity: {report.aiSeverity}
                </span>
              )}
              {report.category && (
                <span className="gtp-insight-chip gtp-chip-category">
                  🏷️ {report.category}
                </span>
              )}
              {report.aiConfidence != null && (
                <span className="gtp-insight-chip gtp-chip-confidence">
                  📊 Confidence: {Math.round(report.aiConfidence * 100)}%
                </span>
              )}
              {report.priority === 1 && (
                <span className="gtp-insight-chip gtp-chip-severity-High">
                  ⚡ High Priority
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── 4-Stage Vertical Timeline ── */}
        <div>
          <p className="gtp-section-title">📍 Resolution Timeline</p>
          <div className="gtp-timeline">
            {STAGES.map((stage, idx) => {
              const done   = stage.isDone(report);
              const active = idx === activeIdx && !done ? true : (idx === activeIdx);
              const dotCls = done
                ? (idx === activeIdx ? 'gtp-stage-dot--active' : 'gtp-stage-dot--done')
                : 'gtp-stage-dot--pending';
              const cardCls = done
                ? (idx === activeIdx ? 'gtp-stage-card--active' : 'gtp-stage-card--done')
                : 'gtp-stage-card--pending';

              // Derive timestamp from history
              const historyEntry = (() => {
                if (idx === 0) return report.history?.find(h => h.action.toLowerCase().includes('filed'));
                if (idx === 1) return report.history?.find(h => h.action.toLowerCase().includes('ai'));
                if (idx === 2) return report.history?.find(h => h.action.toLowerCase().includes('progress') || h.action.toLowerCase().includes('in progress'));
                if (idx === 3) return report.history?.find(h => h.action.toLowerCase().includes('resolved'));
                return null;
              })();

              return (
                <div className="gtp-stage" key={stage.key}>
                  <div className={`gtp-stage-dot ${dotCls}`}>
                    {done ? stage.icon : '○'}
                  </div>
                  <div className={`gtp-stage-card ${cardCls}`}>
                    <div className="gtp-stage-name">{stage.name}</div>
                    <div className="gtp-stage-desc">{stage.desc}</div>
                    {historyEntry && (
                      <div className="gtp-stage-time">
                        {new Date(historyEntry.timestamp).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    )}
                    {done && idx === activeIdx && (
                      <span className="gtp-stage-tag gtp-stage-tag--active">● Current Stage</span>
                    )}
                    {done && idx < activeIdx && (
                      <span className="gtp-stage-tag">✓ Completed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── After Photo ── */}
        {report.afterPhotoURL && (
          <div className="gtp-after-photo">
            <div className="gtp-after-photo-label">📷 After-Resolution Photo</div>
            <img src={report.afterPhotoURL} alt="After resolution" />
          </div>
        )}

        {/* ── Mood / Express Frustration ── */}
        {!['Resolved', 'Rejected'].includes(report.status) && (
          <div className="gtp-mood-box">
            <h3>Is this taking too long?</h3>
            <p>Registering a negative mood immediately flags your ticket as High Priority.</p>
            <div className="gtp-mood-btns">
              <button className="gtp-mood-btn gtp-mood-angry"  onClick={() => sendMood('Frustrated')}>😡 Frustrated</button>
              <button className="gtp-mood-btn gtp-mood-sad"    onClick={() => sendMood('Unhappy')}>😞 Unhappy</button>
              <button className="gtp-mood-btn gtp-mood-neutral" onClick={() => sendMood('Patient')}>😐 Still Patient</button>
            </div>
          </div>
        )}

        {/* ── Social Impact (shown when resolved) ── */}
        {report.status === 'Resolved' && (
          <div className="gtp-impact">
            <h3>🌱 Real-World Impact Achieved</h3>
            <p>{getSocialImpact(report.category)}</p>
            <div className="gtp-impact-footer">Thank you for making a difference in your community!</div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── TopBar sub-component ─────────────────────────────────────────────────────
function TopBar() {
  return (
    <nav className="gtp-topbar">
      <Link to="/" className="gtp-logo">
        <span className="gtp-logo-emblem">🏛️</span>
        <div>
          <span className="gtp-logo-name">Nagrik Setu</span>
          <span className="gtp-logo-tag">Gov-Tech Platform</span>
        </div>
      </Link>
      <Link to="/track" className="gtp-back-link">← Track another</Link>
    </nav>
  );
}
