import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/_/backend';
const STATUS_OPTIONS = ['Pending', 'In Progress', 'Resolved', 'Rejected', 'Escalated'];

function getSeverityColor(severity) {
  if (severity === 'High') return 'bg-red-100 text-red-800 border-red-200';
  if (severity === 'Medium') return 'bg-orange-100 text-orange-800 border-orange-200';
  if (severity === 'Low') return 'bg-green-100 text-green-800 border-green-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
}

function getStatusColor(status) {
  if (status === 'Pending') return 'bg-yellow-100 text-yellow-800';
  if (status === 'In Progress') return 'bg-blue-100 text-blue-800';
  if (status === 'Resolved') return 'bg-green-100 text-green-800';
  if (status === 'Rejected') return 'bg-red-100 text-red-800';
  if (status === 'Escalated') return 'bg-pink-100 text-pink-800';
  return 'bg-gray-100 text-gray-800';
}

export default function AdminDashboardTailwind() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Resolution Modal State
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolvingReport, setResolvingReport] = useState(null);
  const [afterPhotoURL, setAfterPhotoURL] = useState('');
  const [resolving, setResolving] = useState(false);

  // Hidden file input ref
  const fileInputRef = useRef(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/reports/all`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Fetch failed');
      setReports(data.reports);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const updateStatus = async (grievanceId, newStatus, extraPayload = {}) => {
    try {
      const payload = { status: newStatus, actor: 'Admin', ...extraPayload };
      const res = await fetch(`${API_BASE}/api/report/${grievanceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      
      // Update local state
      setReports(prev => prev.map(r => r.grievanceId === grievanceId ? data.report : r));
      return true;
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
      return false;
    }
  };

  const handleStatusChange = (report, newStatus) => {
    if (newStatus === report.status) return;

    if (newStatus === 'Resolved') {
      // Require photo upload
      setResolvingReport(report);
      setIsResolveModalOpen(true);
      setAfterPhotoURL('');
    } else {
      // Prompt for confirmation then apply immediately
      if (window.confirm(`Are you sure you want to change the status to '${newStatus}'?`)) {
        updateStatus(report.grievanceId, newStatus);
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setAfterPhotoURL(event.target.result);
    reader.readAsDataURL(file);
  };

  const submitResolve = async () => {
    if (!afterPhotoURL) {
      alert('Please upload a proof of resolution photo.');
      return;
    }
    setResolving(true);
    const success = await updateStatus(resolvingReport.grievanceId, 'Resolved', { afterPhotoURL, afterLat: resolvingReport.latitude, afterLng: resolvingReport.longitude });
    setResolving(false);
    if (success) {
      setIsResolveModalOpen(false);
      setResolvingReport(null);
    }
  };

  const filteredReports = reports.filter(r => 
    r.grievanceId.toLowerCase().includes(search.toLowerCase()) || 
    r.category.toLowerCase().includes(search.toLowerCase()) ||
    (r.departmentName && r.departmentName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Top Navbar */}
      <header className="bg-govnavy text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Nagrik Setu Logo" className="h-10 w-auto object-contain brightness-0 invert" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight">Nagrik Setu</h1>
              <p className="text-xs text-blue-200 uppercase tracking-widest font-semibold flex items-center gap-1">
                Official Admin Portal
              </p>
            </div>
          </div>
          <div>
             <Link to="/" className="text-sm font-medium text-blue-200 hover:text-white transition-colors">← Citizen Portal</Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Grievance Management</h2>
            <p className="text-sm text-gray-500 mt-1">Review, update, and manage civic issues.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Search ID, Category, or Dept..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-govnavy focus:border-transparent transition-shadow"
            />
            <button onClick={fetchReports} disabled={loading} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              {loading ? '⟳...' : '⟳ Refresh'}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg flex justify-between items-center">
            <p><strong>Error fetching data:</strong> {error}</p>
            <button onClick={fetchReports} className="text-red-700 font-bold hover:underline">Try Again</button>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y text-left text-sm divide-gray-200">
              <thead className="bg-govnavy text-white">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">ID & Date</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">AI Severity / Confidence</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Location</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Current Status</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 whitespace-nowrap">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-govnavy"></div>
                      <p className="mt-2 text-sm font-medium">Loading Grievances...</p>
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500 font-medium">
                      No grievances found.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr key={report.grievanceId} className="hover:bg-blue-50 transition-colors">
                      
                      {/* ID & Date */}
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs text-gray-500 bg-gray-100 py-1 px-2 rounded w-max select-all">
                          {report.grievanceId.slice(0, 8)}...{report.grievanceId.slice(-4)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(report.createdAt).toLocaleString()}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{report.category}</div>
                        <div className="text-xs text-gray-500 font-medium mt-0.5 max-w-xs truncate" title={report.departmentName}>
                          🏢 {report.departmentName || 'Unassigned'}
                        </div>
                      </td>

                      {/* Severity & Confidence */}
                      <td className="px-6 py-4">
                        {report.aiSeverity ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(report.aiSeverity)}`}>
                              {report.aiSeverity}
                            </span>
                            {report.aiConfidence !== null && (
                              <span className="text-xs text-gray-500 font-mono items-center flex gap-1">
                                ⚖️ {(report.aiConfidence * 100).toFixed(0)}% Conf.
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No AI Data</span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4">
                        <a 
                          href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                          Open Maps
                        </a>
                      </td>

                      {/* Current Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(report.status)}`}>
                          {report.status === 'Resolved' && <span className="mr-1">✓</span>}
                          {report.status}
                        </span>
                      </td>

                      {/* Update Action */}
                      <td className="px-6 py-4 text-right">
                        <label className="sr-only" htmlFor={`status-select-${report.grievanceId}`}>Update Status</label>
                        <select
                          id={`status-select-${report.grievanceId}`}
                          className="text-sm border border-gray-300 rounded-lg shadow-sm pl-3 pr-8 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-govnavy focus:border-govnavy transition-all"
                          value={report.status}
                          onChange={(e) => handleStatusChange(report, e.target.value)}
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt} disabled={opt === report.status}>{opt}</option>
                          ))}
                        </select>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 text-sm text-gray-500 font-medium">
            Showing {filteredReports.length} {filteredReports.length === 1 ? 'record' : 'records'}.
          </div>
        </div>
      </main>

      {/* Resolve Modal Overlay */}
      {isResolveModalOpen && resolvingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform">
            <div className="bg-govnavy text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">Proof of Resolution Required</h3>
              <button 
                onClick={() => setIsResolveModalOpen(false)}
                className="text-white hover:text-red-200 text-xl font-bold transition-colors"
                disabled={resolving}
              >&times;</button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                To mark Grievance <strong className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-800">{resolvingReport.grievanceId.slice(0,8)}</strong> as <span className="text-green-700 font-bold">Resolved</span>, you must document the fixed issue. Please upload a clear photo of the completed work.
              </p>

              <div className="mb-6">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="hidden"
                  id="after-photo-upload"
                />
                
                {afterPhotoURL ? (
                  <div className="relative group rounded-xl overflow-hidden shadow-inner border border-gray-200 h-48 w-full bg-gray-100">
                    <img src={afterPhotoURL} alt="Proof" className="object-cover w-full h-full" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <button onClick={() => fileInputRef.current.click()} className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-bold shadow-lg hover:scale-105 transition-transform">
                        Change Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <label 
                    htmlFor="after-photo-upload" 
                    className="flex flex-col items-center justify-center h-48 w-full border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 hover:border-govnavy transition-colors cursor-pointer group"
                  >
                    <svg className="w-10 h-10 text-gray-400 group-hover:text-govnavy mb-3 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <span className="text-sm font-medium text-gray-600 group-hover:text-govnavy transition-colors text-center px-4">
                      <span className="text-govnavy underline decoration-govnavy/40 underline-offset-4">Click to upload</span> a clear photo of the fixed issue.
                    </span>
                  </label>
                )}
              </div>

              <div className="flex gap-3 justify-end items-center mt-8">
                <button 
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={resolving}
                >
                  Cancel
                </button>
                <button 
                  onClick={submitResolve}
                  disabled={!afterPhotoURL || resolving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow transition-colors flex items-center gap-2"
                >
                  {resolving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                      Committing...
                    </>
                  ) : 'Confirm Resolution'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
