import { useState, useEffect, useRef } from 'react';
import './TrackingPage.css';

const API_BASE = 'http://localhost:5000';

function getIconForAction(action) {
  const a = action.toLowerCase();
  if (a.includes('filed')) return '🕒';
  if (a.includes('in progress')) return '🔧';
  if (a.includes('resolved')) return '✅';
  if (a.includes('comment')) return '💬';
  if (a.includes('escalated')) return '⚠️';
  if (a.includes('resource')) return '🏗️';
  if (a.includes('mood')) return '😡';
  if (a.includes('linked')) return '🔗';
  return '📌';
}

export default function TrackingPage() {
  const [searchId, setSearchId] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const pollIntervalRef = useRef(null);
  const lastStatusRef = useRef(null);

  // Check initial notification perm
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  const toggleNotifications = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications.');
      return;
    }
    if (Notification.permission === 'granted') {
      // Toggle off
      setNotificationsEnabled(false);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    } else if (Notification.permission !== 'denied') {
      const p = await Notification.requestPermission();
      if (p === 'granted') {
        setNotificationsEnabled(true);
        new Notification('Nagrik Setu Tracking', { body: 'Notifications enabled!' });
      }
    } else {
      alert('You have denied notifications. Please enable them in browser settings.');
    }
  };

  const fetchReport = async (gId = searchId) => {
    if (!gId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/report/${gId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tracking ID not found');
      setReport(data.report);
      lastStatusRef.current = data.report.status;
    } catch (err) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  // Background polling if notifications enabled
  useEffect(() => {
    if (notificationsEnabled && report) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/api/report/${report.grievanceId}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.report.status !== lastStatusRef.current) {
            lastStatusRef.current = data.report.status;
            setReport(data.report);
            new Notification('Nagrik Setu Update', {
              body: `Your grievance ${data.report.grievanceId.slice(-8)} is now ${data.report.status}!`,
              icon: '/favicon.ico'
            });
          }
        } catch (e) {
          // silent background fail
        }
      }, 5000); // 5 sec poll for rapid demo purposes
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => clearInterval(pollIntervalRef.current);
  }, [notificationsEnabled, report]);

  const sendMood = async (mood) => {
    if (!report || report.status === 'Resolved') return;
    try {
      const res = await fetch(`${API_BASE}/api/report/${report.grievanceId}/mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood })
      });
      const data = await res.json();
      if (res.ok) setReport(data.report);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="tp-container">
      <div className="tp-header">
        <h1>Track Your Grievance</h1>
        <p>Enter your 36-character Grievance ID to see live updates</p>
      </div>

      <div className="tp-search-bar">
        <input 
          type="text" 
          className="tp-input"
          placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchReport()}
        />
        <button className="tp-search-btn" onClick={() => fetchReport()} disabled={loading}>
          {loading ? 'Searching...' : 'Track'}
        </button>
      </div>

      {error && <div className="tp-error">⚠️ {error}</div>}

      {report && (
        <div className="tp-content">
          <div className="tp-card">
            
            <div className="tp-card-header">
              <div className="tp-card-title">
                <h2>{report.category}</h2>
                <span className="tp-id-badge">ID: {report.grievanceId.slice(-8)}</span>
              </div>
              <div className="tp-toggle-wrap">
                <span className="tp-toggle-label">🔔 Notify Me</span>
                <label className="tp-switch">
                  <input type="checkbox" checked={notificationsEnabled} onChange={toggleNotifications} />
                  <span className="tp-slider round"></span>
                </label>
              </div>
            </div>

            <div className="tp-status-banner">
              <span className={`tp-curr-status tp-status-${report.status.replace(' ', '')}`}>
                Current Status: {report.status}
              </span>
              {report.departmentName && <span className="tp-dept">🏢 Assigned to: {report.departmentName}</span>}
            </div>

            <div className="tp-stepper">
              {report.history && report.history.length > 0 ? (
                report.history.map((h, i) => (
                  <div className="tp-step" key={i}>
                    <div className="tp-step-icon">{getIconForAction(h.action)}</div>
                    <div className="tp-step-content">
                      <div className="tp-step-title">{h.action}</div>
                      <div className="tp-step-meta">
                        <span className="tp-actor">{h.actor}</span>
                        <span className="tp-time">{new Date(h.timestamp).toLocaleString()}</span>
                      </div>
                      {h.note && <div className="tp-step-note">{h.note}</div>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="tp-step-meta">No history records found.</div>
              )}
            </div>

            {report.status !== 'Resolved' && report.status !== 'Rejected' && (
              <div className="tp-mood-section">
                <h3>Is this taking too long? Express your frustration.</h3>
                <p>Registering a negative mood will immediately flag your ticket as High Priority to officials.</p>
                <div className="tp-mood-buttons">
                  <button onClick={() => sendMood('Frustrated')} className="tp-mood-btn tp-mood-angry">😡 Frustrated</button>
                  <button onClick={() => sendMood('Unhappy')} className="tp-mood-btn tp-mood-sad">😞 Unhappy</button>
                  <button onClick={() => sendMood('Patient')} className="tp-mood-btn tp-mood-neutral">😐 Still Patient</button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
