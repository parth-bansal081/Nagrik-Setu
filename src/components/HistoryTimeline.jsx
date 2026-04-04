import { useState } from 'react';
import './HistoryTimeline.css';

const ACTION_ICONS = {
  'filed':      '📋',
  'in progress':'🔵',
  'resolved':   '✅',
  'assigned':   '👤',
  'linked':     '🔗',
  'duplicate':  '🔗',
  'escalated':  '⬆️',
  'rejected':   '❌',
  'default':    '⏱️',
};

function getIcon(action = '') {
  const lower = action.toLowerCase();
  for (const [key, icon] of Object.entries(ACTION_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return ACTION_ICONS.default;
}

function formatTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function HistoryTimeline({ history = [] }) {
  const [open, setOpen] = useState(false);

  if (!history.length) return null;

  const latest = history[history.length - 1];

  return (
    <div className="ht-root">
      {/* Collapsed bar — click to expand */}
      <button className="ht-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="ht-latest-dot" />
        <span className="ht-latest-text">
          <span className="ht-latest-action">{latest.action}</span>
          <span className="ht-latest-time">{formatTime(latest.timestamp)}</span>
        </span>
        <span className={`ht-chevron ${open ? 'ht-chevron--open' : ''}`}>▾</span>
        <span className="ht-count-badge">{history.length}</span>
      </button>

      {/* Expanded timeline */}
      {open && (
        <ol className="ht-list">
          {[...history].reverse().map((entry, i) => (
            <li key={i} className={`ht-item ${i === 0 ? 'ht-item--latest' : ''}`}>
              <span className="ht-icon">{getIcon(entry.action)}</span>
              <div className="ht-content">
                <p className="ht-action">{entry.action}</p>
                {entry.note && <p className="ht-note">{entry.note}</p>}
                <p className="ht-meta">
                  <span className="ht-actor">{entry.actor || 'System'}</span>
                  <span className="ht-sep">·</span>
                  <span className="ht-time">{formatTime(entry.timestamp)}</span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
