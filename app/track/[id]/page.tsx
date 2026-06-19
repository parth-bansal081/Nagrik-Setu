'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Grievance, GrievanceHistory } from '@/lib/types';
import StatusStepper from '@/components/StatusStepper';
import MoodButtons from '@/components/MoodButtons';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 bg-slate-50 flex items-center justify-center border border-slate-200 rounded-xl">
      <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  )
});

export default function TrackingPage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grievance, setGrievance] = useState<(Grievance & { history: GrievanceHistory[] }) | null>(null);
  const [updatingMood, setUpdatingMood] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const fetchGrievanceDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/grievances/${id}`);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load grievance details.');
      }
      
      setGrievance(json.data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchGrievanceDetails();
    }
  }, [id]);

  // SLA Timer Tick
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMoodSelect = async (selectedMood: 'frustrated' | 'unhappy' | 'patient') => {
    if (!grievance) return;
    setUpdatingMood(true);
    try {
      const res = await fetch(`/api/grievances/${id}/mood`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mood: selectedMood }),
      });
      
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update mood.');
      }
      
      setGrievance(prev => prev ? {
        ...prev,
        citizen_mood: selectedMood,
        is_high_priority: ['frustrated', 'unhappy'].includes(selectedMood),
      } : null);
      
      fetchGrievanceDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to update mood.');
    } finally {
      setUpdatingMood(false);
    }
  };

  const getSlaTimerDetails = () => {
    if (!grievance || !grievance.deadline) return null;
    
    const created = new Date(grievance.created_at).getTime();
    const deadline = new Date(grievance.deadline).getTime();
    
    const totalSla = deadline - created;
    const elapsed = now - created;
    const percentElapsed = Math.min(100, Math.max(0, Math.round((elapsed / totalSla) * 100)));
    
    const remaining = deadline - now;
    if (remaining <= 0) {
      return { overdue: true, text: 'Overdue (SLA deadline missed)', percent: 100 };
    }
    
    const totalMinutes = Math.floor(remaining / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return {
      overdue: false,
      text: `${hours} hours ${minutes} minutes remaining`,
      percent: percentElapsed
    };
  };

  const copyShareLink = () => {
    if (!grievance) return;
    const shareUrl = `${window.location.origin}/track/${grievance.grievance_id}`;
    navigator.clipboard.writeText(shareUrl);
    setToastMessage('Link copied!');
    setTimeout(() => setToastMessage(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-700 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500">Loading grievance tracking details...</p>
      </div>
    );
  }

  if (error || !grievance) {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-200 shadow-sm rounded-xl p-8 text-center space-y-4">
        <span className="text-3xl block">⚠️</span>
        <h3 className="font-extrabold text-slate-800 text-lg">Grievance Not Found</h3>
        <p className="text-sm text-slate-500">{error || 'Could not find the requested grievance record.'}</p>
        <Link
          href="/"
          className="inline-block bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-2 rounded-lg text-xs transition-all mt-4"
        >
          Go Back Home
        </Link>
      </div>
    );
  }

  const isResolved = grievance.status === 'RESOLVED';

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8 relative">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Left Column: Summary and Mood */}
        <div className="md:col-span-1 space-y-6">
          {/* Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 block">
                Complaint Reference
              </span>
              <h2 className="font-extrabold text-slate-800 text-lg font-mono flex items-center justify-between">
                <span>{grievance.grievance_id}</span>
                {grievance.is_high_priority && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] rounded-full border border-red-200 uppercase font-black animate-pulse">
                    Priority
                  </span>
                )}
              </h2>
              
              <button
                type="button"
                onClick={copyShareLink}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#041A3E] text-xs font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-2"
              >
                🔗 Share this complaint
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3.5">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                <span className="text-sm font-semibold text-slate-700">{grievance.category}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Department</span>
                <span className="text-sm font-semibold text-slate-700">
                  {grievance.department_name || 'Calculating routing...'}
                </span>
              </div>
            </div>
          </div>

          {/* SLA COUNTDOWN CARD */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">SLA DEADLINE</span>
            {isResolved ? (
              <div className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg font-bold flex items-center gap-1.5">
                <span>✅</span> Resolved successfully
              </div>
            ) : grievance.deadline ? (() => {
              const timer = getSlaTimerDetails();
              if (!timer) return <span className="text-slate-400 italic text-sm">Not calculated yet</span>;
              
              const remainingPercent = 100 - timer.percent;
              let progressColor = 'bg-green-600';
              let textColor = 'text-green-700 bg-green-50 border border-green-200';
              
              if (remainingPercent < 20) {
                progressColor = 'bg-red-600';
                textColor = 'text-red-700 bg-red-50 border border-red-200';
              } else if (remainingPercent <= 50) {
                progressColor = 'bg-amber-500';
                textColor = 'text-amber-700 bg-amber-50 border border-amber-200';
              }
              
              return (
                <div className="space-y-3">
                  <div className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${textColor}`}>
                    <span>⏰</span> {timer.text}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                      <div
                        className={`${progressColor} h-full transition-all duration-500`}
                        style={{ width: `${timer.percent}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase">
                      <span>{timer.percent}% elapsed</span>
                      <span>{100 - timer.percent}% remaining</span>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="text-xs text-slate-500 font-semibold italic flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
                <span>⏳</span> Being processed by AI agents...
              </div>
            )}
          </div>

          {/* Image Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Evidence Uploaded</span>
            {grievance.image_url ? (
              <img
                src={grievance.image_url}
                alt="Grievance Evidence"
                className="w-full h-40 object-cover rounded-lg border border-slate-100 bg-slate-50"
              />
            ) : (
              <div className="w-full h-40 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                No photo evidence
              </div>
            )}
          </div>

          {/* Mini-Map Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">📍 COMPLAINT LOCATION</span>
            <MapPicker
              readOnly={true}
              heightClass="h-48"
              initialLat={grievance.latitude}
              initialLng={grievance.longitude}
            />
          </div>

          {/* Mood Section */}
          {!isResolved && (
            <MoodButtons
              onMoodSelect={handleMoodSelect}
              currentMood={grievance.citizen_mood}
              disabled={updatingMood}
            />
          )}
        </div>

        {/* Right Column: Timeline */}
        <div className="md:col-span-2">
          <StatusStepper currentStatus={grievance.status} history={grievance.history} />
        </div>
      </div>

      {/* Share Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg z-50 animate-bounce">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
