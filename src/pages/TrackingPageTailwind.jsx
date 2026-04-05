import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/_/backend';

const STAGES = [
  {
    key: 'submitted',
    name: 'Reported',
    desc: 'Grievance received and logged in the system.',
    isDone: () => true,
  },
  {
    key: 'ai_verified',
    name: 'AI Verified',
    desc: 'Gemini AI has analyzed the report and routed it.',
    isDone: (r) => !!r.aiSummary,
  },
  {
    key: 'action_taken',
    name: 'In Progress',
    desc: 'Official department has initiated work on this issue.',
    isDone: (r) => ['In Progress', 'Resolved'].includes(r.status),
  },
  {
    key: 'resolved',
    name: 'Resolved',
    desc: 'The issue has been completely fixed and closed.',
    isDone: (r) => r.status === 'Resolved',
  },
];

export default function TrackingPageTailwind() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const fetchReport = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/report/${id}`);
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

  useEffect(() => {
    fetchReport();
    pollRef.current = setInterval(fetchReport, 30000);
    return () => clearInterval(pollRef.current);
  }, [id]);

  const getActiveStage = (r) => {
    let last = 0;
    STAGES.forEach((s, i) => { if (s.isDone(r)) last = i; });
    return last;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-govnavy animate-pulse flex flex-col items-center">
          <svg className="w-12 h-12 mb-4 animate-spin text-govnavy" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p className="font-semibold text-lg tracking-wide">Fetching Grievance Details...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border top-govnavy border-t-8">
          <span className="text-5xl block mb-4">😕</span>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Grievance Not Found</h2>
          <p className="text-gray-600 mb-8">{error || 'The Tracking ID you provided could not be located.'}</p>
          <Link to="/track" className="bg-govnavy text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-900 transition-colors inline-block w-full text-center shadow-md">
            ← Return to Search
          </Link>
        </div>
      </div>
    );
  }

  const activeIdx = getActiveStage(report);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">

      {/* Top Navbar */}
      <header className="bg-govnavy text-white shadow-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 decoration-transparent">
            <img src="/logo.jpg" alt="Nagrik Setu Logo" className="h-10 w-auto object-contain brightness-0 invert" />
            <div className="hidden sm:block">
              <h1 className="text-base font-bold tracking-tight">Nagrik Setu</h1>
              <p className="text-[0.65rem] text-blue-200 uppercase tracking-widest font-semibold flex items-center">
                Live Tracker
              </p>
            </div>
          </Link>
          <Link to="/track" className="text-sm font-medium text-blue-200 hover:text-white transition-colors underline underline-offset-4 decoration-blue-500">Track Another</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8">

        {/* Header Block */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10"></div>
          <div>
            <h2 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-1">{report.category}</h2>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Grievance Status</h1>
            <p className="text-gray-500 font-mono text-sm mt-2 font-medium bg-gray-100 py-1 px-3 inline-block rounded-md border border-gray-200">
              ID: {report.grievanceId}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold capitalize shadow-sm border
                 ${report.status === 'Resolved' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                 ${report.status === 'In Progress' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}
                 ${report.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : ''}
                 ${report.status === 'Escalated' ? 'bg-pink-100 text-pink-800 border-pink-200' : ''}
                 ${report.status === 'Rejected' ? 'bg-red-100 text-red-800 border-red-200' : ''}
              `}>
              <span className={`mr-2 w-2 h-2 rounded-full animate-pulse
                  ${report.status === 'Resolved' ? 'bg-green-500' : ''}
                  ${report.status === 'In Progress' ? 'bg-blue-500' : ''}
                  ${report.status === 'Pending' ? 'bg-yellow-500' : ''}
                  ${report.status === 'Escalated' ? 'bg-pink-500' : ''}
                  ${report.status === 'Rejected' ? 'bg-red-500' : ''}
                `}></span>
              {report.status}
            </span>
            {report.departmentName && (
              <span className="text-xs font-semibold text-gray-500">Assigned: {report.departmentName}</span>
            )}
          </div>
        </div>

        {/* CSS Grid for Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Smart Verification Card */}
          {(report.aiSummary || report.aiSeverity) && (
            <div className="bg-govnavy rounded-2xl shadow-xl overflow-hidden text-white flex flex-col h-full transform transition-all duration-300 relative group">
              <div className="absolute -right-4 -top-8 text-[120px] opacity-5 group-hover:scale-110 transition-transform duration-500">🤖</div>
              <div className="p-6 border-b border-white/10 flex items-center justify-between z-10">
                <h3 className="text-sm font-bold uppercase tracking-widest text-blue-300 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  Smart Verification
                </h3>
                {report.aiConfidence && (
                  <span className="bg-white/10 px-2.5 py-1 rounded text-xs font-mono font-bold text-blue-200 border border-white/10">
                    {Math.round(report.aiConfidence * 100)}% Match
                  </span>
                )}
              </div>

              <div className="p-6 flex-grow flex flex-col justify-center z-10">
                <blockquote className="text-lg font-medium leading-relaxed italic text-blue-50">
                  "{report.aiSummary}"
                </blockquote>
              </div>

              <div className="px-6 py-4 bg-black/20 flex gap-3 z-10 font-semibold text-xs tracking-wide">
                <div className="bg-blue-500/20 text-blue-200 border border-blue-400/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <span className="opacity-80">Category:</span> {report.category}
                </div>
                {report.aiSeverity && (
                  <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5
                     ${report.aiSeverity === 'High' ? 'bg-red-500/20 text-red-300 border-red-500/30' : ''}
                     ${report.aiSeverity === 'Medium' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : ''}
                     ${report.aiSeverity === 'Low' ? 'bg-green-500/20 text-green-300 border-green-500/30' : ''}
                   `}>
                    <span className="opacity-80">Severity:</span> {report.aiSeverity}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stepper Timeline */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 flex flex-col h-full">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Resolution Timeline
            </h3>

            <div className="relative pl-4 border-l-2 border-gray-100 flex-grow py-2">
              {STAGES.map((stage, idx) => {
                const done = stage.isDone(report);
                const active = idx === activeIdx && !done ? true : (idx === activeIdx);

                return (
                  <div key={stage.key} className="mb-8 relative last:mb-0">
                    {/* Node icon connecting back to border-l-2 */}
                    <div className="absolute -left-[25px] flex items-center justify-center w-8 h-8 xl:-left-[25px]">
                      {done ? (
                        stage.key === 'ai_verified' ? (
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow font-bold text-white text-xs border border-green-200">✓</div>
                        ) : (
                          <div className="w-4 h-4 bg-govnavy rounded-full shadow border-2 border-white ring-4 ring-blue-50"></div>
                        )
                      ) : active ? (
                        <div className="w-5 h-5 bg-blue-500 rounded-full shadow animate-pulse ring-4 ring-blue-100"></div>
                      ) : (
                        <div className="w-3 h-3 bg-gray-300 rounded-full border-2 border-white shadow-sm"></div>
                      )}
                    </div>
                    <div className="ml-6">
                      <h4 className={`text-base font-bold ${done ? 'text-gray-900' : active ? 'text-blue-600' : 'text-gray-400'}`}>
                        {stage.name}
                      </h4>
                      <p className={`mt-1 text-sm ${done || active ? 'text-gray-600' : 'text-gray-400'}`}>
                        {stage.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Resolved Action Block / After Photo */}
        {report.status === 'Resolved' && report.afterPhotoURL && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mt-4 transition-all duration-500 flex flex-col md:flex-row items-center gap-8 border-l-8 border-l-green-500">
            <div className="w-full md:w-1/3 flex-shrink-0">
              <div className="rounded-xl overflow-hidden shadow-md border border-gray-200 border-4 bg-gray-50 h-48 sm:h-auto">
                <img src={report.afterPhotoURL} alt="Proof of Resolution" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="w-full md:w-2/3">
              <span className="bg-green-100 text-green-800 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded inline-block mb-3">✓ Resolution Verified</span>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Issue Successfully Resolved</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                The responsible department has provided photographic proof that work is completed. Thank you for using Nagrik Setu to improve your community infrastructure.
              </p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
