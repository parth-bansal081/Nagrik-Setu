import './DepartmentPerformance.css';

export default function DepartmentPerformance({ stats }) {
  if (!stats) return null;

  const { total = 0, Pending = 0, Resolved = 0 } = stats;
  const inProgress = stats['In Progress'] || 0;
  const resolvedPct = total > 0 ? Math.round((Resolved / total) * 100) : 0;

  const tiles = [
    { label: 'Total',       value: total,      color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Pending',     value: Pending,    color: '#d97706', bg: '#fffbeb' },
    { label: 'In Progress', value: inProgress, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Resolved',    value: Resolved,   color: '#16a34a', bg: '#f0fdf4' },
  ];

  return (
    <div className="dp-widget">
      <div className="dp-header">
        <span className="dp-icon">📊</span>
        <div>
          <h3 className="dp-title">Department Performance</h3>
          <p className="dp-sub">Overall grievance resolution rate</p>
        </div>
      </div>

      <div className="dp-tiles">
        {tiles.map(({ label, value, color, bg }) => (
          <div key={label} className="dp-tile" style={{ background: bg, borderColor: color + '33' }}>
            <span className="dp-tile-value" style={{ color }}>{value}</span>
            <span className="dp-tile-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="dp-progress-section">
        <div className="dp-progress-header">
          <span>Resolution Rate</span>
          <span className="dp-pct" style={{ color: resolvedPct >= 60 ? '#16a34a' : '#d97706' }}>
            {resolvedPct}%
          </span>
        </div>
        <div className="dp-track">
          <div
            className="dp-fill"
            style={{
              width: `${resolvedPct}%`,
              background: resolvedPct >= 60
                ? 'linear-gradient(90deg,#16a34a,#22c55e)'
                : 'linear-gradient(90deg,#d97706,#f59e0b)',
            }}
          />
        </div>
        <p className="dp-caption">{Resolved} of {total} tickets resolved</p>
      </div>
    </div>
  );
}
