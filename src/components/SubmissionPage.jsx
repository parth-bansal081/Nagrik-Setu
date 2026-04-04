import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './SubmissionPage.css';


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


const redIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});


function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

const CATEGORIES = ['Roads', 'Water Supply', 'Electricity', 'Others'];

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/_/backend';
const DEMO_USER_ID = 'citizen_demo_001';

export default function SubmissionPage() {
  const [markerPos, setMarkerPos] = useState(null);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState(null);


  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);   // { grievanceId, departmentName, status }
  const [apiError, setApiError] = useState(null);

  const markerRef = useRef(null);


  const handleMarkerDrag = useCallback(() => {
    const m = markerRef.current;
    if (m) {
      const { lat, lng } = m.getLatLng();
      setMarkerPos({ lat, lng });
    }
  }, []);

  const handleMapClick = (latlng) => {
    setMarkerPos({ lat: latlng.lat, lng: latlng.lng });

    setResult(null);
    setApiError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setApiError(null);
    setResult(null);

    let base64Image = '';
    if (photoFile) {
      const reader = new FileReader();
      base64Image = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(photoFile);
      });
    }

    const payload = {
      userId:      DEMO_USER_ID,
      latitude:    parseFloat(markerPos.lat.toFixed(6)),
      longitude:   parseFloat(markerPos.lng.toFixed(6)),
      category,
      description,
      imageURL:    base64Image,
    };

    console.log('📤 Submitting grievance:', JSON.stringify(payload, null, 2));

    try {
      const res = await fetch(`${API_BASE}/api/report`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type');
      let data = {};
      
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      }

      if (!res.ok || !data.success) {
        const errMsg = data.error || `Server error (${res.status})`;
        throw new Error(errMsg);
      }

      console.log('✅ Grievance filed:', data);
      setResult(data);


      setCategory('');
      setDescription('');
      setPhotoFile(null);
      setMarkerPos(null);

    } catch (err) {
      console.error('❌ Submission failed:', err.message);
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ns-page">

      <header className="ns-header">
        <div className="ns-header-inner">
          <div className="ns-logo">
            <span className="ns-logo-icon">🏛️</span>
            <div>
              <h1 className="ns-logo-title">Nagrik Setu</h1>
              <p className="ns-logo-sub">Citizen–Government Bridge</p>
            </div>
          </div>
          <nav className="ns-nav">
            <Link to="/">Home</Link>
            <Link to="/" className="ns-nav-active">Report</Link>
            <Link to="/track" className="ns-nav-track">📍 Track</Link>
            <Link to="/leaderboard" className="ns-nav-leaderboard">🏆 Leaderboard</Link>
            <Link to="/official" className="ns-nav-official">🏛️ Official Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="ns-main">

        <section className="ns-hero">
          <h2>Report a Local Issue</h2>
          <p>
            Pin the exact location on the map, describe the problem, and submit your grievance.
            Our civic team will respond within <strong>48 hours</strong>.
          </p>
        </section>


        <section className="ns-card ns-map-card">
          <div className="ns-card-header">
            <span className="ns-card-icon">📍</span>
            <div>
              <h3>Pin the Location</h3>
              <p className="ns-card-sub">Click anywhere on the map to drop a marker. Drag it to fine-tune.</p>
            </div>
          </div>

          <div className="ns-map-wrapper">
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              className="ns-leaflet-map"
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onMapClick={handleMapClick} />
              {markerPos && (
                <Marker
                  position={[markerPos.lat, markerPos.lng]}
                  icon={redIcon}
                  draggable={true}
                  ref={markerRef}
                  eventHandlers={{ dragend: handleMarkerDrag }}
                />
              )}
            </MapContainer>


            <div className={`ns-coords-badge ${markerPos ? 'ns-coords-badge--active' : ''}`}>
              {markerPos ? (
                <>
                  <span className="ns-coords-dot" />
                  <span>
                    <strong>Lat:</strong> {markerPos.lat.toFixed(6)} &nbsp;|&nbsp;
                    <strong>Lng:</strong> {markerPos.lng.toFixed(6)}
                  </span>
                </>
              ) : (
                <span className="ns-coords-hint">🖱️ Click on the map to set location</span>
              )}
            </div>
          </div>
        </section>


        <section className="ns-card ns-form-card">
          <div className="ns-card-header">
            <span className="ns-card-icon">📝</span>
            <div>
              <h3>Report a Grievance</h3>
              <p className="ns-card-sub">Fill in the details below to complete your report.</p>
            </div>
          </div>

          <form className="ns-form" onSubmit={handleSubmit} noValidate>

            <div className="ns-field">
              <label htmlFor="category" className="ns-label">
                Category <span className="ns-required">*</span>
              </label>
              <div className="ns-select-wrapper">
                <select
                  id="category"
                  className="ns-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="" disabled>Select a category…</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <span className="ns-select-arrow">▾</span>
              </div>
            </div>


            <div className="ns-field">
              <label htmlFor="description" className="ns-label">
                Description <span className="ns-required">*</span>
              </label>
              <textarea
                id="description"
                className="ns-textarea"
                rows={5}
                placeholder="Describe the issue in detail — when did you notice it, how severe is it, and who is affected?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <span className="ns-char-count">{description.length} / 1000 characters</span>
            </div>


            <div className="ns-field">
              <label htmlFor="photo" className="ns-label">Upload Evidence Photo</label>
              <label htmlFor="photo" className="ns-file-label">
                <span className="ns-file-icon">📷</span>
                <span className="ns-file-text">
                  {photoFile ? photoFile.name : 'Choose a photo or drag & drop here'}
                </span>
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  className="ns-file-input"
                  onChange={(e) => setPhotoFile(e.target.files[0] || null)}
                />
              </label>
              {photoFile && (
                <p className="ns-file-name">
                  ✅ Selected: <em>{photoFile.name}</em>
                  <button
                    type="button"
                    className="ns-file-clear"
                    onClick={() => setPhotoFile(null)}
                  >
                    ✕ Remove
                  </button>
                </p>
              )}
            </div>

            {/* Validation hint if marker not set */}
            {!markerPos && (
              <div className="ns-alert">
                ⚠️ Please pin a location on the map before submitting.
              </div>
            )}

            {/* API error */}
            {apiError && (
              <div className="ns-alert ns-alert--error">
                ❌ {apiError}
              </div>
            )}

            <button
              type="submit"
              className={`ns-submit-btn ${loading ? 'ns-submit-btn--loading' : ''}`}
              disabled={!markerPos || !category || !description.trim() || loading}
            >
              {loading ? (
                <span className="ns-spinner-row"><span className="ns-spinner" />Submitting…</span>
              ) : 'Submit Grievance →'}
            </button>
          </form>

          {result && (
            <div className="ns-success-card">
              <div className="ns-success-icon">✅</div>
              <div className="ns-success-body">
                <h4>Grievance Filed Successfully!</h4>
                <p>
                  Your complaint has been assigned to{' '}
                  <strong>{result.departmentName}</strong>.
                </p>

                {/* Proximity / Master Ticket alert */}
                {result.proximityAlert && (
                  <div className="ns-proximity-alert">
                    <span className="ns-proximity-icon">🔗</span>
                    <div>
                      <strong>Duplicate Detected — Linked to Master Ticket</strong>
                      <p>{result.proximityAlert.message}</p>
                      <span className="ns-proximity-id">
                        Master ID: {result.proximityAlert.masterShortId}
                      </span>
                    </div>
                  </div>
                )}

                <div className="ns-tracking-box">
                  <span className="ns-tracking-label">Your Tracking ID</span>
                  <span className="ns-tracking-id">{result.grievanceId}</span>
                  <button
                    className="ns-copy-btn"
                    onClick={() => navigator.clipboard.writeText(result.grievanceId)}
                  >
                    📋 Copy
                  </button>
                </div>
                <p className="ns-tracking-hint">
                  Status: <span className="ns-status-badge">{result.status}</span>
                  &nbsp;— use your Tracking ID to follow up.
                </p>
              </div>
            </div>
          )}
        </section>
        <section className="ns-faq">
          <div className="ns-card-header">
            <span className="ns-card-icon">💡</span>
            <h3>Help & FAQ</h3>
          </div>
          <div className="ns-faq-content">
            <details>
              <summary>How does Auto-Routing work?</summary>
              <p>When you submit a grievance, our AI-powered engine immediately scans the category and location, automatically routing the ticket to the correct government department (e.g., PWD for Roads, Jal Shakti for Water).</p>
            </details>
            <details>
              <summary>What happens if my issue isn't resolved in time?</summary>
              <p>Nagrik Setu features an Escalation Engine! Every category has a strict deadline (e.g., 24h for Water, 7 days for Roads). If an official misses the deadline, the ticket is instantly escalated to a Supervising Official, and you will be notified.</p>
            </details>
            <details>
              <summary>Why do you ask for my Mood on the tracking page?</summary>
              <p>If an issue is taking too long to resolve, you can log your mood as "Frustrated" or "Unhappy". This instantly tags your ticket as High Priority on the Official Dashboard with a red pulsing alert!</p>
            </details>
          </div>
        </section>

      </main>

      <footer className="ns-footer">
        <p>© 2026 Nagrik Setu — Bridging Citizens &amp; Government &nbsp;|&nbsp; Powered by OpenStreetMap</p>
      </footer>
    </div>
  );
}

