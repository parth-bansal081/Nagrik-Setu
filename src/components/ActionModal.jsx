import { useState } from 'react';
import './ActionModal.css';

const API_BASE = 'http://localhost:5000';

export default function ActionModal({ report, onClose, onUpdated }) {
  const [afterPhotoFile, setAfterPhotoFile] = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);

  const [commentText, setCommentText]       = useState('');
  const [resItem, setResItem]               = useState('');
  const [resQty, setResQty]                 = useState('');

  if (!report) return null;

  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      setLoading(true); setError(null);
      const res = await fetch(`${API_BASE}/api/report/${report.grievanceId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdated(data.report);
      setCommentText('');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleResource = async () => {
    if (!resItem.trim() || !resQty.trim()) return;
    try {
      setLoading(true); setError(null);
      const res = await fetch(`${API_BASE}/api/report/${report.grievanceId}/resource`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: resItem, quantity: resQty })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdated(data.report);
      setResItem(''); setResQty('');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const patchStatus = async (status) => {
    setLoading(true);
    setError(null);

    const body = { status };
    if (status === 'Resolved') {
      if (!afterPhotoFile) {
        setError('Please upload the "After" photo before marking as Resolved.');
        setLoading(false);
        return;
      }
      body.afterPhotoURL = afterPhotoFile.name;

      // Grab official's geolocation for location verification
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        body.afterLat = pos.coords.latitude;
        body.afterLng = pos.coords.longitude;
      } catch (geoErr) {
        console.warn('Geolocation failed', geoErr);
      }
    }

    try {
      const res = await fetch(`${API_BASE}/api/report/${report.grievanceId}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Update failed');
      onUpdated(data.report);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isAlreadyInProgress = report.status === 'In Progress';

  return (
    <div className="am-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="am-modal">
        {/* Header */}
        <div className="am-header">
          <div>
            <h2 className="am-title">Take Action</h2>
            <p className="am-subtitle">
              Grievance&nbsp;
              <span className="am-gid" title={report.grievanceId}>
                …{report.grievanceId?.slice(-8)}
              </span>
            </p>
          </div>
          <button className="am-close" onClick={onClose}>✕</button>
        </div>

        {/* Summary */}
        <div className="am-summary">
          <div className="am-summary-row">
            <span className="am-label">Category</span>
            <span className="am-value">{report.category}</span>
          </div>
          <div className="am-summary-row">
            <span className="am-label">Department</span>
            <span className="am-value">{report.departmentName}</span>
          </div>
          <div className="am-summary-row">
            <span className="am-label">Current Status</span>
            <span className="am-value">{report.status}</span>
          </div>
          <div className="am-summary-row am-desc-row">
            <span className="am-label">Description</span>
            <span className="am-value am-desc">{report.description}</span>
          </div>
        </div>

        {/* Divider */}
        <p className="am-section-title">Update Status</p>

        {/* Action 1: In Progress */}
        <div className="am-action-card am-action--in-progress">
          <div className="am-action-info">
            <span className="am-action-icon">🔵</span>
            <div>
              <h4>Mark as In-Progress</h4>
              <p>Acknowledge the complaint and begin working on it.</p>
            </div>
          </div>
          <button
            className="am-btn am-btn--inprogress"
            onClick={() => patchStatus('In Progress')}
            disabled={loading || isAlreadyInProgress}
          >
            {isAlreadyInProgress ? 'Already In-Progress' : loading ? 'Updating…' : 'Mark In-Progress →'}
          </button>
        </div>

        {/* Action 2: Resolved */}
        <div className="am-action-card am-action--resolve">
          <div className="am-action-info">
            <span className="am-action-icon">✅</span>
            <div>
              <h4>Mark as Resolved</h4>
              <p>Upload an "After" photo. We will also check your location vs original pin.</p>
            </div>
          </div>

          <label className="am-file-label">
            <span className="am-file-icon">📷</span>
            <span className="am-file-text">
              {afterPhotoFile ? afterPhotoFile.name : 'Choose After Photo (required)'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="am-file-input"
              onChange={(e) => {
                setAfterPhotoFile(e.target.files[0] || null);
                setError(null);
              }}
            />
          </label>

          <button
            className="am-btn am-btn--resolve"
            onClick={() => patchStatus('Resolved')}
            disabled={loading || !afterPhotoFile}
          >
            {loading ? 'Resolving…' : !afterPhotoFile ? 'Upload Photo to Enable' : 'Mark Resolved ✓'}
          </button>
        </div>

        {/* Action 3: Internal Comment */}
        <div className="am-action-card am-action--comment">
          <div className="am-action-info">
            <span className="am-action-icon">💬</span>
            <div>
              <h4>Internal Comment</h4>
              <p>Log a hurdle or note internally.</p>
            </div>
          </div>
          <div className="am-input-row">
            <input type="text" className="am-input" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Type a comment..." disabled={loading}/>
            <button className="am-btn am-btn--neutral" onClick={handleComment} disabled={!commentText.trim() || loading}>Post</button>
          </div>
        </div>

        {/* Action 4: Resource Request (WOW Factor) */}
        <div className="am-action-card am-action--resource">
          <div className="am-action-info">
            <span className="am-action-icon">🏗️</span>
            <div>
              <h4>Request Resources</h4>
              <p>Need materials to fix this? E.g., 5 bags of cement.</p>
            </div>
          </div>
          <div className="am-input-row">
            <input type="text" className="am-input" style={{flex:2}} value={resItem} onChange={e => setResItem(e.target.value)} placeholder="Item" disabled={loading}/>
            <input type="text" className="am-input" style={{flex:1}} value={resQty} onChange={e => setResQty(e.target.value)} placeholder="Qty" disabled={loading}/>
            <button className="am-btn am-btn--resource" onClick={handleResource} disabled={!resItem.trim() || !resQty.trim() || loading}>Request</button>
          </div>
        </div>

        {/* Error */}
        {error && <div className="am-error">⚠️ {error}</div>}
      </div>
    </div>
  );
}
