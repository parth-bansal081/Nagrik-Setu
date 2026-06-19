'use client';

import { useState, Fragment } from 'react';
import { Grievance, GrievanceStatus, Department } from '@/lib/types';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

interface GrievanceTableProps {
  grievances: Grievance[];
  onStatusUpdate: (id: string, newStatus: string) => Promise<void>;
  onResolveAttempt: (id: string, afterPhotoBase64: string, lat: number, lng: number) => Promise<{ success: boolean; error?: string }>;
}

export default function GrievanceTable({ grievances, onStatusUpdate, onResolveAttempt }: GrievanceTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Row history caching
  const [rowHistory, setRowHistory] = useState<Record<string, any[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({});

  // Resolution modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [resolveGrievanceId, setResolveGrievanceId] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const toggleRow = async (id: string) => {
    const isExpanding = expandedRow !== id;
    setExpandedRow(isExpanding ? id : null);
    
    if (isExpanding && !rowHistory[id]) {
      setHistoryLoading(prev => ({ ...prev, [id]: true }));
      try {
        const res = await fetch(`/api/grievances/${id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.history) {
            setRowHistory(prev => ({ ...prev, [id]: json.data.history }));
          }
        }
      } catch (err) {
        console.error('Failed to load history for row:', err);
      } finally {
        setHistoryLoading(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const getStatusBadge = (status: GrievanceStatus) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 uppercase tracking-wide">Pending</span>;
      case 'AI_VERIFIED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 uppercase tracking-wide">AI Verified</span>;
      case 'ROUTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wide">Routed</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 uppercase tracking-wide">In Progress</span>;
      case 'ESCALATED':
        return (
          <span className="relative inline-flex">
            <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 animate-ping"></span>
            <span className="relative px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-500 text-white uppercase tracking-wide">Escalated</span>
          </span>
        );
      case 'RESOLVED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 uppercase tracking-wide">Resolved</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 uppercase tracking-wide">Rejected</span>;
    }
  };

  const getSeverityDot = (severity: string | null) => {
    if (severity === 'High') {
      return (
        <span className="flex items-center gap-1.5 text-red-600 font-medium">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse inline-block"></span> High
        </span>
      );
    } else if (severity === 'Medium') {
      return (
        <span className="flex items-center gap-1.5 text-yellow-600 font-medium">
          <span className="h-2 w-2 rounded-full bg-yellow-500 inline-block"></span> Medium
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1.5 text-green-600 font-medium">
          <span className="h-2 w-2 rounded-full bg-green-500 inline-block"></span> Low
        </span>
      );
    }
  };

  const handleStatusChange = async (id: string, value: string) => {
    if (value === 'RESOLVED') {
      setResolveGrievanceId(id);
      setResolveError(null);
      setAfterPhoto(null);
      setCoords(null);
      setModalOpen(true);
      return;
    }

    setUpdatingId(id);
    try {
      await onStatusUpdate(id, value);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAfterPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getGPSLocation = () => {
    setGpsLoading(true);
    setResolveError(null);
    if (!navigator.geolocation) {
      setResolveError('Geolocation is not supported by your browser.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      (err) => {
        console.error(err);
        setResolveError('Failed to capture GPS. Please grant permission.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const submitResolution = async () => {
    if (!resolveGrievanceId || !afterPhoto || !coords) {
      setResolveError('Both after-photo and GPS location are required.');
      return;
    }

    setResolving(true);
    setResolveError(null);
    try {
      const res = await onResolveAttempt(resolveGrievanceId, afterPhoto, coords.lat, coords.lng);
      if (res.success) {
        setModalOpen(false);
        setResolveGrievanceId(null);
      } else {
        setResolveError(res.error || 'Verification failed.');
      }
    } catch (err: any) {
      setResolveError(err.message || 'An error occurred during verification.');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Grid of Grievances */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Grievance ID</th>
                <th className="py-4 px-6">Citizen</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Severity</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grievances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 px-6 text-center text-slate-400 font-medium">
                    No grievances matching filters.
                  </td>
                </tr>
              ) : (
                grievances.map((g) => {
                  const isExpanded = expandedRow === g.id;
                  const isHighPriority = g.is_high_priority;
                  const isEscalatedLevel2 = g.escalation_level >= 2;

                  let borderClass = '';
                  if (isHighPriority) {
                    borderClass = 'border-l-4 border-l-red-500 animate-pulse';
                  } else if (isEscalatedLevel2) {
                    borderClass = 'border-l-4 border-l-orange-500 shadow-orange-100 shadow-sm';
                  }

                  return (
                    <Fragment key={g.id}>
                      <tr
                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${borderClass} ${isExpanded ? 'bg-slate-50/30' : ''}`}
                        onClick={() => toggleRow(g.id)}
                      >
                        <td className="py-4 px-6 font-semibold text-slate-800">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono">{g.grievance_id}</span>
                            <div className="flex gap-1 flex-wrap">
                              {g.is_duplicate && (
                                <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] rounded font-bold">
                                  Dup
                                </span>
                              )}
                              {g.escalation_level > 0 && (
                                <span className="inline-block px-1.5 py-0.5 bg-orange-100 border border-orange-200 text-orange-800 text-[9px] rounded font-extrabold uppercase tracking-wide">
                                  ⚠️ Escalated Lv.{g.escalation_level}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-600">
                          <div className="text-sm font-medium">{g.citizen_name}</div>
                          <div className="text-xs text-slate-400">{g.citizen_phone}</div>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-600">{g.category}</td>
                        <td className="py-4 px-6 text-sm">{getSeverityDot(g.ai_severity)}</td>
                        <td className="py-4 px-6 text-sm font-medium text-slate-700">{g.department_name || 'Unassigned'}</td>
                        <td className="py-4 px-6">{getStatusBadge(g.status)}</td>
                        <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 justify-end">
                            <select
                              disabled={updatingId === g.id || g.status === 'RESOLVED' || g.status === 'REJECTED'}
                              value={g.status}
                              onChange={(e) => handleStatusChange(g.id, e.target.value)}
                              className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                              <option value="PENDING" disabled>Pending</option>
                              <option value="AI_VERIFIED" disabled>AI Verified</option>
                              <option value="ROUTED" disabled>Routed</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="RESOLVED">Resolved</option>
                              <option value="REJECTED" disabled>Rejected</option>
                            </select>
                            <button
                              onClick={() => toggleRow(g.id)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-all cursor-pointer"
                            >
                              {isExpanded ? 'Hide' : 'Details'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0 border-b border-slate-200">
                            <div className="bg-slate-50/50 p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 text-sm text-slate-600">
                              {/* Left column: Photos, Details and History */}
                              <div className="space-y-4">
                                <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-200 pb-1.5">
                                  {g.grievance_id} — DETAILS
                                </h4>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h5 className="font-bold text-slate-800 text-xs mb-2 uppercase">Before Photo</h5>
                                    {g.image_url ? (
                                      <img
                                        src={g.image_url}
                                        alt="Before"
                                        className="w-full h-44 object-cover rounded-xl border border-slate-200 bg-white"
                                      />
                                    ) : (
                                      <div className="w-full h-44 bg-slate-100 rounded-xl flex items-center justify-center border text-slate-400">
                                        No photo uploaded
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-slate-800 text-xs mb-2 uppercase">After Photo</h5>
                                    {g.after_image_url ? (
                                      <img
                                        src={g.after_image_url}
                                        alt="After"
                                        className="w-full h-44 object-cover rounded-xl border border-slate-200 bg-white"
                                      />
                                    ) : (
                                      <div className="w-full h-44 bg-slate-100 rounded-xl flex items-center justify-center border text-slate-400 text-center p-4">
                                        Pending resolution verification
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                                  <div>
                                    <span className="font-bold text-slate-800 text-xs uppercase block">Description:</span>
                                    <p className="mt-1 text-slate-600 font-semibold">{g.description}</p>
                                  </div>
                                  
                                  <div className="border-t border-slate-100 pt-3">
                                    <span className="font-bold text-slate-800 text-xs uppercase block">AI Analysis:</span>
                                    <div className="mt-1.5 space-y-1 font-semibold text-xs text-slate-600">
                                      <p className="italic">"{g.ai_summary || 'N/A'}"</p>
                                      <p>
                                        <strong>Confidence Score:</strong> {g.ai_confidence ? `${Math.round(g.ai_confidence * (g.ai_confidence <= 1 ? 100 : 1))}%` : 'N/A'} |{' '}
                                        <strong>AI Category:</strong> {g.ai_category || g.category} |{' '}
                                        <strong>Severity:</strong> {g.ai_severity || 'Low'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Status updating panel inside expanded view */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                                  <span className="font-bold text-slate-800 text-xs uppercase block">Status Control Panel</span>
                                  <div className="flex gap-2.5 items-center flex-wrap">
                                    <select
                                      disabled={updatingId === g.id || g.status === 'RESOLVED' || g.status === 'REJECTED'}
                                      value={g.status}
                                      onChange={(e) => handleStatusChange(g.id, e.target.value)}
                                      className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                      <option value="PENDING" disabled>Pending</option>
                                      <option value="IN_PROGRESS">In Progress</option>
                                      <option value="RESOLVED">Resolved</option>
                                    </select>
                                    
                                    {g.status !== 'RESOLVED' && g.status !== 'REJECTED' && (
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(g.id, 'RESOLVED')}
                                        className="bg-green-700 hover:bg-green-800 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-sm cursor-pointer"
                                      >
                                        Mark Resolved →
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right column: Interactive Pin Location Map & History Logs */}
                              <div className="space-y-6">
                                <div className="space-y-2">
                                  <h5 className="font-bold text-slate-800 text-xs uppercase">Incident Location Map</h5>
                                  <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200 relative z-0">
                                    <MapPicker initialLat={g.latitude} initialLng={g.longitude} readOnly={true} heightClass="h-48" />
                                  </div>
                                  {g.address_text && (
                                    <div className="bg-white p-3 rounded-lg border border-slate-150 text-xs font-semibold text-slate-600 mt-2">
                                      📍 <strong>Address:</strong> {g.address_text}, {g.address_city}, {g.address_pincode}
                                    </div>
                                  )}
                                  <div className="text-[10px] text-slate-400 font-mono flex justify-between">
                                    <span>Lat: {g.latitude.toFixed(5)}</span>
                                    <span>Lng: {g.longitude.toFixed(5)}</span>
                                  </div>
                                </div>

                                {/* Audit Logs Timeline */}
                                <div className="space-y-3">
                                  <h5 className="font-bold text-slate-800 text-xs uppercase border-b border-slate-200 pb-1.5">
                                    Audit & Heartbeat History Logs
                                  </h5>
                                  
                                  {historyLoading[g.id] ? (
                                    <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                                      <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                                      <span>Retrieving timeline audit logs...</span>
                                    </div>
                                  ) : !rowHistory[g.id] || rowHistory[g.id].length === 0 ? (
                                    <span className="text-xs text-slate-400 italic">No audit records found.</span>
                                  ) : (
                                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                      {rowHistory[g.id].map((log) => {
                                        return (
                                          <div key={log.id} className="text-xs border-l-2 border-slate-200 pl-3 py-0.5 space-y-1">
                                            <div className="flex justify-between font-semibold text-slate-400">
                                              <span>{log.actor.replace('_', ' ')}</span>
                                              <span>
                                                {new Date(log.created_at).toLocaleString('en-IN', {
                                                  day: 'numeric',
                                                  month: 'short',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })}
                                              </span>
                                            </div>
                                            <p className="text-slate-600 font-semibold text-[11px] leading-relaxed">
                                              {log.event}: {log.metadata?.reason || log.metadata?.summary || `Grievance transitioned successfully.`}
                                            </p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Lock Verification Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <span>🔐</span> Resolution Lock Verification
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                To close this grievance, AI verification requires you to upload an "after" image of the completed work, and verify that your current GPS is within 100m of the complaint site.
              </p>

              {/* 1. After photo upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">1. Upload After-Photo</label>
                {afterPhoto ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 h-32">
                    <img src={afterPhoto} alt="After Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setAfterPhoto(null)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-white rounded-xl cursor-pointer transition-all">
                    <span className="text-2xl mb-1">📸</span>
                    <span className="text-xs font-bold text-slate-500">Click to upload After-Photo</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                )}
              </div>

              {/* 2. GPS Location Capture */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">2. Confirm Location (GPS Lock)</label>
                <div className="flex gap-3 items-center">
                  <button
                    disabled={gpsLoading}
                    onClick={getGPSLocation}
                    className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white font-semibold px-4 py-2.5 rounded-lg text-xs flex-1 transition-all"
                  >
                    {gpsLoading ? 'Capturing Location...' : coords ? '✓ GPS Location Captured' : '📍 Get My GPS Location'}
                  </button>
                </div>
                {coords && (
                  <div className="bg-slate-50 p-2.5 rounded-lg text-[10px] text-slate-500 font-mono flex justify-between border border-slate-200">
                    <span>Lat: {coords.lat.toFixed(5)}</span>
                    <span>Lng: {coords.lng.toFixed(5)}</span>
                  </div>
                )}
              </div>
            </div>

            {resolveError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs font-medium">
                ⚠️ {resolveError}
              </div>
            )}

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button
                disabled={resolving}
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={resolving || !afterPhoto || !coords}
                onClick={submitResolution}
                className="bg-green-700 hover:bg-green-800 disabled:bg-slate-300 text-white font-semibold px-5 py-2 rounded-lg text-xs transition-all shadow-sm"
              >
                {resolving ? 'AI Verifying...' : 'Submit Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
