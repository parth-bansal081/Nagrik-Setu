'use client';

interface DAIDeptData {
  department_id: string;
  department_name: string;
  total: number;
  resolved: number;
  escalated: number;
  avgHours: number;
  moods: string[];
  slaHours: number;
}

interface DAICardProps {
  dept: DAIDeptData;
}

export default function DAICard({ dept }: DAICardProps) {
  // 1. Calculate scores
  const totalTickets = dept.total || 0;
  
  // Resolution Rate
  const resolutionRate = totalTickets > 0 ? (dept.resolved / totalTickets) : 0;
  const resolutionScore = resolutionRate * 35;
  
  // Speed Score
  const speedRatio = totalTickets > 0 && dept.resolved > 0 
    ? Math.max(0, 1 - (dept.avgHours / dept.slaHours)) 
    : 1.0;
  const speedScore = speedRatio * 25;
  
  // Happiness Score
  const moodMap: Record<string, number> = { patient: 1.0, unhappy: 0.4, frustrated: 0.0 };
  const validMoods = dept.moods ? dept.moods.filter(Boolean) : [];
  const avgMood = validMoods.length > 0
    ? validMoods.reduce((sum, m) => sum + (moodMap[m] ?? 0.6), 0) / validMoods.length
    : 0.6;
  const happinessScore = avgMood * 25;
  
  // Escalation Penalty
  const escalationRate = totalTickets > 0 ? (dept.escalated / totalTickets) : 0;
  const escalationPenalty = escalationRate * 15;
  
  // Overall DAI
  const overallDAI = totalTickets > 0 
    ? Math.max(0, Math.min(100, Math.round(resolutionScore + speedScore + happinessScore - escalationPenalty)))
    : 100; // Baseline 100 if no complaints

  // Get letter grade
  const getGrade = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 75) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    return 'D';
  };

  const grade = getGrade(overallDAI);

  // Grade styling
  const getGradeStyle = (g: string) => {
    if (g.startsWith('A')) return 'bg-green-100 text-green-800 border-green-200';
    if (g === 'B') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (g === 'C') return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  // Icon chooser
  const getIcon = (id: string) => {
    switch (id) {
      case 'PWD': return '🏗️';
      case 'JAL_SHAKTI': return '💧';
      case 'DISCOM': return '⚡';
      default: return '🏛️';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 hover:shadow-md transition-all">
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getIcon(dept.department_id)}</span>
          <h3 className="font-bold text-slate-800 text-base">{dept.department_name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getGradeStyle(grade)}`}>
            {grade}
          </span>
          <span className="font-mono font-extrabold text-lg text-slate-700">{overallDAI}</span>
        </div>
      </div>

      {/* Main DAI bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wide">
          <span>Overall Accountability Index</span>
          <span>{overallDAI}/100</span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              overallDAI >= 75 ? 'bg-green-600' : overallDAI >= 60 ? 'bg-yellow-500' : overallDAI >= 40 ? 'bg-orange-500' : 'bg-red-600'
            }`}
            style={{ width: `${overallDAI}%` }}
          />
        </div>
      </div>

      {/* Breakdown lines */}
      <div className="space-y-3 pt-2 text-xs">
        {/* Resolution Rate */}
        <div className="flex items-center justify-between gap-4">
          <span className="w-28 text-slate-500 font-medium">Resolution Rate</span>
          <span className="w-10 text-right font-mono font-bold text-slate-700">{(resolutionRate * 100).toFixed(0)}%</span>
          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${resolutionRate * 100}%` }} />
          </div>
          <span className="w-12 text-right font-mono font-bold text-slate-500">{Math.round(resolutionScore)}pts</span>
        </div>

        {/* Speed Score */}
        <div className="flex items-center justify-between gap-4">
          <span className="w-28 text-slate-500 font-medium">Speed Score</span>
          <span className="w-10 text-right font-mono font-bold text-slate-700">{(speedRatio * 100).toFixed(0)}%</span>
          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${speedRatio * 100}%` }} />
          </div>
          <span className="w-12 text-right font-mono font-bold text-slate-500">{Math.round(speedScore)}pts</span>
        </div>

        {/* Happiness Score */}
        <div className="flex items-center justify-between gap-4">
          <span className="w-28 text-slate-500 font-medium">Happiness Score</span>
          <span className="w-10 text-right font-mono font-bold text-slate-700">{(avgMood * 100).toFixed(0)}%</span>
          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-green-600 h-full rounded-full" style={{ width: `${avgMood * 100}%` }} />
          </div>
          <span className="w-12 text-right font-mono font-bold text-slate-500">{Math.round(happinessScore)}pts</span>
        </div>

        {/* Escalation Rate */}
        <div className="flex items-center justify-between gap-4">
          <span className="w-28 text-slate-500 font-medium">Escalation Rate</span>
          <span className="w-10 text-right font-mono font-bold text-slate-700">{(escalationRate * 100).toFixed(0)}%</span>
          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-red-600 h-full rounded-full" style={{ width: `${escalationRate * 100}%` }} />
          </div>
          <span className="w-12 text-right font-mono font-bold text-red-500">-{Math.round(escalationPenalty)}pts</span>
        </div>
      </div>

      {/* Footer details */}
      <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-400 font-medium flex flex-wrap justify-between gap-2">
        <div>
          Total: <span className="text-slate-700 font-bold">{totalTickets}</span> complaints | Resolved: <span className="text-slate-700 font-bold">{dept.resolved}</span>
        </div>
        <div>
          Avg Resolution: <span className="text-slate-700 font-bold">{dept.avgHours}hrs</span> | SLA: <span className="text-slate-700 font-bold">{dept.slaHours}hrs</span>
        </div>
      </div>
    </div>
  );
}
