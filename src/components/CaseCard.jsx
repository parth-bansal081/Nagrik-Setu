import './CaseCard.css';
import HistoryTimeline from './HistoryTimeline';

const STATUS_CONFIG = {
  'Pending':     { label: 'Pending',     cls: 'badge--pending' },
  'In Progress': { label: 'In Progress', cls: 'badge--inprogress' },
  'Resolved':    { label: 'Resolved',    cls: 'badge--resolved' },
  'Rejected':    { label: 'Rejected',    cls: 'badge--rejected' },
  'Escalated':   { label: 'Escalated',   cls: 'badge--escalated' },
};

const CATEGORY_ICONS = {
  'Roads':        '🛣️',
  'Water Supply': '💧',
  'Electricity':  '⚡',
  'Others':       '📋',
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Pending'];
  return <span className={`cc-badge ${cfg.cls}`}>{cfg.label}</span>;
}

export default function CaseCard({ report, onAction }) {
  const {
    grievanceId, category, description, departmentName,
    status, imageURL, createdAt, latitude, longitude,
    history = [], masterTicketId, linkedReportIds = [],
    deadline, locationVerified, feedback
  } = report;

  const shortId = grievanceId ? `…${grievanceId.slice(-8)}` : '—';
  const date = createdAt ? new Date(createdAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) : '—';

  const isMaster  = linkedReportIds.length > 0;
  const isLinked  = !!masterTicketId;


  const now = new Date();
  const createdDate = new Date(createdAt);
  const deadlineDate = deadline ? new Date(deadline) : null;
  let isHighPriority = !!report.isHighPriority;
  let deadlineText = '';

  if (deadlineDate && status !== 'Resolved' && status !== 'Rejected') {
    const totalMs = deadlineDate - createdDate;
    const elapsedMs = now - createdDate;
    if (elapsedMs / totalMs > 0.75) isHighPriority = true;
    
    const remainingMs = deadlineDate - now;
    if (remainingMs < 0) {
      deadlineText = 'Deadline Passed';
      isHighPriority = true;
    } else {
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      if (hours > 24) deadlineText = `Due in ${Math.floor(hours/24)}d`;
      else deadlineText = `Due in ${hours}h`;
    }
  }

  return (
    <div className={`cc-card ${status === 'Resolved' ? 'cc-card--resolved' : ''} ${isMaster ? 'cc-card--master' : ''} ${isHighPriority ? 'cc-card--high-priority' : ''}`}>

      {isMaster && (
        <div className="cc-master-ribbon">
          👑 Master Ticket · {linkedReportIds.length} duplicate{linkedReportIds.length !== 1 ? 's' : ''} linked
        </div>
      )}
      {isLinked && (
        <div className="cc-linked-ribbon">
          🔗 Linked to Master …{masterTicketId.slice(-8)}
        </div>
      )}


      <div className="cc-header">
        <div className="cc-id-row">
          <span className="cc-category-icon">{CATEGORY_ICONS[category] || '📋'}</span>
          <span className="cc-category">{category}</span>
          <StatusBadge status={status} />
        </div>
        <div className="cc-header-right">
            {deadlineText && <span className="cc-deadline">⏰ {deadlineText}</span>}
            <span className="cc-id" title={grievanceId}>ID: {shortId}</span>
        </div>
      </div>


      <div className="cc-body">
        <div className="cc-photo-wrap">
          {imageURL ? (
            <img src={imageURL} alt="Evidence" className="cc-photo" />
          ) : (
            <div className="cc-photo-placeholder">
              <span>📷</span>
              <span>No photo</span>
            </div>
          )}
        </div>
        <div className="cc-details">
          <p className="cc-description">{description}</p>
          <div className="cc-meta">
            <span>🏢 {departmentName}</span>
            <span>📅 {date}</span>
            {latitude && longitude && (
              <span>📍 {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}</span>
            )}
            {locationVerified && (
              <span className="cc-loc-verified">✅ Verified Location</span>
            )}
          </div>
        </div>
      </div>


      {feedback && (
        <div className="cc-feedback-wrap">
          <span className="cc-feedback-label">Citizen Feedback:</span>
          <span className="cc-feedback-stars">{'⭐'.repeat(feedback.rating)}</span>
          {feedback.comment && <p className="cc-feedback-comment">"{feedback.comment}"</p>}
        </div>
      )}


      {history.length > 0 && (
        <div className="cc-timeline-wrap">
          <HistoryTimeline history={history} />
        </div>
      )}


      <div className="cc-footer">
        <button
          className="cc-action-btn"
          onClick={() => onAction(report)}
          disabled={status === 'Resolved' || status === 'Rejected'}
        >
          {status === 'Resolved'
            ? '✅ Resolved'
            : status === 'Rejected'
            ? '❌ Rejected'
            : '⚡ Take Action'}
        </button>
      </div>
    </div>
  );
}

