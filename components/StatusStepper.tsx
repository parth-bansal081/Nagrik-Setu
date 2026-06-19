'use client';

import { GrievanceStatus } from '@/lib/types';
import { useLanguage } from '@/lib/i18n';

interface StatusStepperProps {
  currentStatus: GrievanceStatus;
  history: any[];
}

export default function StatusStepper({ currentStatus, history }: StatusStepperProps) {
  const { t } = useLanguage();

  const steps = [
    { key: 'PENDING', label: 'Reported', activeStatuses: ['PENDING', 'AI_VERIFIED', 'ROUTED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED'] },
    { key: 'AI_VERIFIED', label: 'AI Verified', activeStatuses: ['AI_VERIFIED', 'ROUTED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED'] },
    { key: 'ROUTED', label: 'Routed', activeStatuses: ['ROUTED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED'] },
    { key: 'IN_PROGRESS', label: 'In Progress', activeStatuses: ['IN_PROGRESS', 'ESCALATED', 'RESOLVED'] },
    { key: 'RESOLVED', label: 'Resolved', activeStatuses: ['RESOLVED'] },
  ];

  const isStepCompleted = (step: typeof steps[0]) => {
    return step.activeStatuses.includes(currentStatus);
  };

  const isStepCurrent = (step: typeof steps[0], index: number) => {
    if (currentStatus === 'REJECTED' && step.key === 'AI_VERIFIED') {
      return true;
    }
    if (currentStatus === 'ESCALATED' && step.key === 'IN_PROGRESS') {
      return true;
    }
    
    // Last step where isStepCompleted is true
    const nextStep = steps[index + 1];
    return isStepCompleted(step) && (!nextStep || !isStepCompleted(nextStep));
  };

  const renderStepDetails = (stepKey: string) => {
    switch (stepKey) {
      case 'PENDING': {
        const sub = history.find(h => h.event === 'SUBMITTED');
        if (!sub) return null;
        return (
          <div className="text-xs text-slate-500 mt-1 space-y-0.5">
            <p className="font-semibold text-slate-400">
              {new Date(sub.created_at).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="text-slate-600 font-medium">Filed by citizen from Chittorgarh</p>
          </div>
        );
      }
      case 'AI_VERIFIED': {
        const verified = history.find(h => h.event === 'AI_VERIFIED');
        const rejected = history.find(h => h.event === 'REJECTED');
        if (verified) {
          const meta = verified.metadata || {};
          const conf = meta.confidence ? Math.round(meta.confidence * (meta.confidence <= 1 ? 100 : 1)) : 94;
          return (
            <div className="text-xs text-slate-500 mt-1 space-y-1">
              <p className="font-semibold text-slate-400">
                {new Date(verified.created_at).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
                <p className="text-slate-700 font-semibold leading-relaxed">
                  🤖 <strong>Vision Agent:</strong> "{meta.summary || 'Valid infrastructure issue detected.'}"
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">
                  Confidence: {conf}% | Severity: {meta.severity || 'Medium'}
                </p>
              </div>
            </div>
          );
        }
        if (rejected) {
          const meta = rejected.metadata || {};
          return (
            <div className="text-xs text-red-500 mt-1 space-y-1">
              <p className="font-semibold text-slate-400">
                {new Date(rejected.created_at).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
                <p className="font-bold">❌ Complaint Rejected by AI</p>
                <p className="mt-1 leading-relaxed font-semibold">
                  Reason: {meta.reason || 'Image does not show a valid outdoor infrastructure grievance.'}
                </p>
              </div>
            </div>
          );
        }
        if (currentStatus === 'PENDING') {
          return <p className="text-xs text-slate-400 mt-1 italic font-semibold">⏳ Awaiting AI verification check...</p>;
        }
        return null;
      }
      case 'ROUTED': {
        const routed = history.find(h => h.event === 'ROUTED');
        if (routed) {
          const meta = routed.metadata || {};
          return (
            <div className="text-xs text-slate-500 mt-1 space-y-1">
              <p className="font-semibold text-slate-400">
                {new Date(routed.created_at).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
                <p className="text-slate-700 font-semibold">
                  🗺️ <strong>Routing Agent:</strong> Assigned to {meta.department_name || meta.department_id || 'General Admin'}
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">
                  SLA Deadline: {meta.sla_hours || 48} hours ({meta.severity || 'Medium'} severity)
                </p>
              </div>
            </div>
          );
        }
        if (['PENDING', 'AI_VERIFIED'].includes(currentStatus)) {
          return <p className="text-xs text-slate-400 mt-1 italic font-semibold">⏳ Awaiting department routing...</p>;
        }
        return null;
      }
      case 'IN_PROGRESS': {
        const inProg = history.find(h => ['STATUS_UPDATED_IN_PROGRESS', 'IN_PROGRESS'].includes(h.event));
        const escalated = currentStatus === 'ESCALATED';
        if (inProg || ['IN_PROGRESS', 'ESCALATED', 'RESOLVED'].includes(currentStatus)) {
          const date = inProg
            ? new Date(inProg.created_at).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '';
          return (
            <div className="text-xs text-slate-500 mt-1 space-y-0.5">
              {date && <p className="font-semibold text-slate-400">{date}</p>}
              <p className="text-slate-600 font-semibold flex items-center gap-1.5">
                {escalated ? (
                  <span className="text-red-600 font-bold">⚠️ Issue escalated due to SLA breach</span>
                ) : (
                  <span>⚙️ Assigned engineers are executing repairs on-site</span>
                )}
              </p>
            </div>
          );
        }
        return <p className="text-xs text-slate-400 mt-1 italic font-semibold">Awaiting update</p>;
      }
      case 'RESOLVED': {
        const resolved = history.find(h => h.event === 'RESOLVED');
        if (resolved) {
          const meta = resolved.metadata || {};
          const conf = meta.confidence ? Math.round(meta.confidence * (meta.confidence <= 1 ? 100 : 1)) : 100;
          return (
            <div className="text-xs text-slate-500 mt-1 space-y-1">
              <p className="font-semibold text-slate-400">
                {new Date(resolved.created_at).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 space-y-1 text-green-800">
                <p className="font-bold">✅ Resolution Verified On-Site</p>
                {meta.reason && <p className="leading-relaxed font-semibold">" {meta.reason} "</p>}
                <p className="text-[10px] text-green-600 uppercase tracking-widest font-extrabold">
                  GPS Match Verified | Confidence: {conf}%
                </p>
              </div>
            </div>
          );
        }
        return <p className="text-xs text-slate-400 mt-1 italic font-semibold">Pending</p>;
      }
      default:
        return null;
    }
  };

  if (currentStatus === 'REJECTED') {
    const rejectedEvent = history.find(h => h.event === 'REJECTED') || history.find(h => h.event?.includes('REJECTED'));
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <span>❌</span> Complaint Rejected by AI
        </h3>
        <p className="text-sm mt-2 font-medium">
          Reason: {rejectedEvent?.metadata?.reason || 'Verification image does not show a valid outdoor infrastructure grievance.'}
        </p>
        <span className="text-xs text-red-500 block mt-4">
          {rejectedEvent ? new Date(rejectedEvent.created_at).toLocaleString() : ''}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
        <span>📋</span> Grievance Timeline
      </h3>

      <div className="relative border-l-2 border-slate-200 ml-4 pl-8 space-y-8">
        {steps.map((step, idx) => {
          const completed = isStepCompleted(step);
          const current = isStepCurrent(step, idx);

          // Color indicators
          let dotClass = 'bg-slate-200 border-slate-200 text-slate-400';
          if (completed) {
            dotClass = 'bg-blue-600 border-blue-600 text-white';
          }
          if (current) {
            dotClass = 'bg-orange-500 border-orange-500 text-white animate-pulse';
            if (currentStatus === 'RESOLVED') {
              dotClass = 'bg-green-600 border-green-600 text-white';
            }
          }

          return (
            <div key={step.key} className="relative">
              {/* Timeline Indicator Dot */}
              <span className={`absolute -left-[41px] top-1.5 flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-bold ${dotClass}`}>
                {currentStatus === 'RESOLVED' && step.key === 'RESOLVED' ? '✓' : completed && !current ? '✓' : idx + 1}
              </span>

              {/* Content Card */}
              <div>
                <h4 className={`font-semibold text-sm ${current ? 'text-orange-600' : completed ? 'text-slate-800' : 'text-slate-400'}`}>
                  {step.label}
                  {current && currentStatus === 'ESCALATED' && (
                    <span className="ml-2 inline-block px-2 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full uppercase tracking-wider font-extrabold animate-pulse">
                      Escalated
                    </span>
                  )}
                  {current && currentStatus === 'IN_PROGRESS' && (
                    <span className="ml-2 inline-block px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] rounded-full uppercase tracking-wider font-bold">
                      Active
                    </span>
                  )}
                </h4>
                {renderStepDetails(step.key)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
