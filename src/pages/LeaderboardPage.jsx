import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LeaderboardPage.css';

const API_BASE = 'http://localhost:5000';

export default function LeaderboardPage() {
  const [board, setBoard] = useState([]);
  const [pulse, setPulse] = useState({ activeRepairs: 0, totalResolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/leaderboard`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch leaderboard');
        setBoard(data.leaderboard);
        setPulse(data.cityPulse);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="lb-page">
      <header className="lb-header">
        <div className="lb-header-inner">
          <div className="lb-logo">
            <span className="lb-logo-icon">🏛️</span>
            <div>
              <h1 className="lb-logo-title">Nagrik Setu</h1>
              <p className="lb-logo-sub">Public Accountability</p>
            </div>
          </div>
          <nav className="lb-nav">
            <Link to="/">Home</Link>
            <Link to="/track">Track</Link>
            <Link to="/official" className="lb-nav-official">🏛️ Official Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="lb-main">
        <div className="lb-title-sec">
          <h2>Department Accountability Leaderboard</h2>
          <p>Real-time metrics tracking the efficiency of government departments across the district.</p>
        </div>

        {/* City Pulse */}
        <section className="lb-pulse">
          <div className="lb-pulse-card lb-pulse-active">
            <h3>Active Repairs</h3>
            <div className="lb-pulse-val">{pulse.activeRepairs}</div>
            <p>Issues currently In Progress</p>
          </div>
          <div className="lb-pulse-card lb-pulse-resolved">
            <h3>Total Resolved</h3>
            <div className="lb-pulse-val">{pulse.totalResolved}</div>
            <p>Issues fixed by the city</p>
          </div>
        </section>

        {/* Leaderboard Table/List */}
        <section className="lb-board">
          {loading && <div className="lb-loading">Gathering data...</div>}
          {error && <div className="lb-error">⚠️ {error}</div>}
          
          {!loading && !error && board.map((dept, idx) => (
            <div className={`lb-dept-card ${idx === 0 ? 'lb-dept-first' : ''}`} key={dept.departmentId}>
              <div className="lb-dept-rank">#{idx + 1}</div>
              <div className="lb-dept-info">
                <h3 className="lb-dept-name">{dept.departmentName}</h3>
                <p className="lb-dept-address">📍 {dept.address}, {dept.district}, {dept.state}</p>
              </div>
              
              <div className="lb-dept-metrics">
                <div className="lb-metric">
                  <span className="lb-metric-label">Resolution Rate</span>
                  <div className="lb-metric-progress">
                    <div 
                      className="lb-progress-bar" 
                      style={{ width: `${dept.resolutionRate}%`, backgroundColor: dept.resolutionRate > 50 ? '#10b981' : '#f59e0b' }} 
                    />
                  </div>
                  <span className="lb-metric-val">{dept.resolutionRate}%</span>
                  <span className="lb-metric-sub">{dept.resolvedIssues} / {dept.totalIssues} cases</span>
                </div>
                
                <div className="lb-metric lb-metric-time">
                  <span className="lb-metric-label">Avg Resolution Time</span>
                  <span className="lb-metric-val">{dept.avgTimeStr}</span>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Help & FAQ Section */}
        <section className="lb-faq">
          <div className="lb-faq-header">
            <h2>Help & FAQ</h2>
            <p>Understanding how Nagrik Setu works</p>
          </div>
          <div className="lb-faq-grid">
            <div className="lb-faq-item">
              <h4>🤖 How does Auto-Routing work?</h4>
              <p>When you upload an image, our AI instantly verifies it and auto-routes your grievance to the correct government department (e.g., Water Board, PWD) based on the context and location.</p>
            </div>
            <div className="lb-faq-item">
              <h4>⏱️ What is the Escalation Process?</h4>
              <p>Every issue category has a strict deadline (e.g., Water Leaks = 24h). If the deadline passes without resolution, the issue is automatically escalated to a higher-ranking Supervising Official, increasing its priority level.</p>
            </div>
            <div className="lb-faq-item">
              <h4>🎯 What happens to duplicates?</h4>
              <p>If multiple citizens report the exact same issue (like the same pothole), our system detects the duplicate image using ImageHash. Instead of spamming officials, it links the reports and boosts the priority of the original issue!</p>
            </div>
            <div className="lb-faq-item">
              <h4>🌟 How is the Leaderboard calculated?</h4>
              <p>The leaderboard ranks departments purely on performance: Resolution Rate (Resolved / Total Cases) and Average Resolution Time. Transparency holds everyone accountable.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
