'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import DAICard from '@/components/DAICard';

// Hardcoded seed data for Tab 1 (National View) with Trend
const nationalData = [
  { rank: 1, name: "Tamil Nadu", dai: 82, grade: "A", resolved: 91, happiness: 78, escalation: 8, total: 1240, trend: "up", trendValue: "+3" },
  { rank: 2, name: "Maharashtra", dai: 78, grade: "A", resolved: 87, happiness: 72, escalation: 11, total: 2100, trend: "same", trendValue: "0" },
  { rank: 3, name: "Karnataka", dai: 74, grade: "B", resolved: 83, happiness: 69, escalation: 14, total: 980, trend: "down", trendValue: "-2" },
  { rank: 4, name: "Rajasthan", dai: 71, grade: "B", resolved: 80, happiness: 65, escalation: 16, total: 760, isLive: true, trend: "up", trendValue: "+1" },
  { rank: 5, name: "Haryana", dai: 66, grade: "B", resolved: 74, happiness: 61, escalation: 19, total: 540, trend: "same", trendValue: "0" },
  { rank: 6, name: "Gujarat", dai: 68, grade: "B", resolved: 76, happiness: 63, escalation: 17, total: 890, trend: "up", trendValue: "+2" },
  { rank: 7, name: "Delhi", dai: 61, grade: "B", resolved: 69, happiness: 57, escalation: 22, total: 3200, trend: "down", trendValue: "-4" },
  { rank: 8, name: "Madhya Pradesh", dai: 55, grade: "C", resolved: 62, happiness: 51, escalation: 28, total: 670, trend: "up", trendValue: "+1" },
  { rank: 9, name: "Uttar Pradesh", dai: 43, grade: "C", resolved: 49, happiness: 41, escalation: 35, total: 4100, trend: "down", trendValue: "-3" },
  { rank: 10, name: "Bihar", dai: 38, grade: "D", resolved: 43, happiness: 34, escalation: 42, total: 1800, trend: "same", trendValue: "0" },
];

// Hardcoded Rajasthan cities data for Tab 2 (State View) with Trend
const rajasthanCities = [
  { rank: 1, name: "Jaipur", dai: 79, grade: "A", resolved: 88, happiness: 74, escalation: 10, total: 320, trend: "up", trendValue: "+2" },
  { rank: 2, name: "Udaipur", dai: 75, grade: "A", resolved: 84, happiness: 70, escalation: 13, total: 180, trend: "same", trendValue: "0" },
  { rank: 3, name: "Jodhpur", dai: 72, grade: "B", resolved: 81, happiness: 67, escalation: 15, total: 210, trend: "down", trendValue: "-1" },
  { rank: 4, name: "Ajmer", dai: 65, grade: "B", resolved: 73, happiness: 60, escalation: 20, total: 140, trend: "same", trendValue: "0" },
  { rank: 5, name: "Chittorgarh", dai: 71, grade: "B", resolved: 80, happiness: 65, escalation: 16, total: 89, isLive: true, trend: "up", trendValue: "+1" },
  { rank: 6, name: "Kota", dai: 58, grade: "C", resolved: 65, happiness: 54, escalation: 26, total: 195, trend: "down", trendValue: "-3" },
  { rank: 7, name: "Bikaner", dai: 62, grade: "B", resolved: 70, happiness: 58, escalation: 22, total: 160, trend: "up", trendValue: "+1" },
];

export default function AccountabilityPage() {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'national' | 'state' | 'constituency'>('national');
  const [selectedState, setSelectedState] = useState('Rajasthan');

  // live scoring explainer state
  const [explainerOpen, setExplainerOpen] = useState(false);

  // Live data state for Tab 3 (Constituency View)
  const [liveData, setLiveData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'constituency') {
      const fetchLiveData = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await fetch('/api/accountability');
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Failed to fetch live data.');
          setLiveData(json.data || []);
        } catch (err: any) {
          setError(err.message || 'Error loading live performance metrics.');
        } finally {
          setLoading(false);
        }
      };
      fetchLiveData();
    }
  }, [activeTab]);

  const getGradeBadgeClass = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800 border-green-200';
    if (grade.startsWith('B')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (grade.startsWith('C')) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const computeDaiMetrics = (dept: any) => {
    const totalTickets = dept.total || 0;
    const resolutionRate = totalTickets > 0 ? (dept.resolved / totalTickets) : 0;
    const resolutionScore = resolutionRate * 35;
    const speedRatio = totalTickets > 0 && dept.resolved > 0 
      ? Math.max(0, 1 - (dept.avgHours / dept.slaHours)) 
      : 1.0;
    const speedScore = speedRatio * 25;
    const moodMap: Record<string, number> = { patient: 1.0, unhappy: 0.4, frustrated: 0.0 };
    const validMoods = dept.moods ? dept.moods.filter(Boolean) : [];
    const avgMood = validMoods.length > 0
      ? validMoods.reduce((sum: number, m: string) => sum + (moodMap[m] ?? 0.6), 0) / validMoods.length
      : 0.6;
    const happinessScore = avgMood * 25;
    const escalationRate = totalTickets > 0 ? (dept.escalated / totalTickets) : 0;
    const escalationPenalty = escalationRate * 15;
    
    const overallDAI = totalTickets > 0 
      ? Math.max(0, Math.min(100, Math.round(resolutionScore + speedScore + happinessScore - escalationPenalty)))
      : 100;
      
    const getGrade = (score: number) => {
      if (score >= 90) return 'A+';
      if (score >= 75) return 'A';
      if (score >= 60) return 'B';
      if (score >= 40) return 'C';
      return 'D';
    };
    
    return {
      dai: overallDAI,
      grade: getGrade(overallDAI)
    };
  };

  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* Header section (full width, light gray background) */}
      <div className="bg-slate-100 border-b border-slate-200 py-12 px-8 w-full">
        <div className="max-w-6xl mx-auto space-y-2">
          <h2 className="font-extrabold text-slate-800 text-3xl tracking-tight">
            Department Accountability Index
          </h2>
          <p className="text-slate-500 text-sm md:text-base max-w-3xl leading-relaxed">
            Real-time performance scores calculated from resolution speed, citizen happiness, and escalation rates.
          </p>
        </div>
      </div>

      {/* Main content area */}
      <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        
        {/* Collapsible Score Explainer Card */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 transition-all">
          <button
            type="button"
            onClick={() => setExplainerOpen(!explainerOpen)}
            className="w-full flex justify-between items-center text-sm font-bold text-slate-750 cursor-pointer focus:outline-none"
          >
            <span className="flex items-center gap-2">ℹ️ How is the DAI Score calculated?</span>
            <span className="text-xs uppercase font-extrabold text-[#041A3E] tracking-wide">
              {explainerOpen ? '▲ collapse' : '▼ expand'}
            </span>
          </button>
          
          {explainerOpen && (
            <div className="mt-4 border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-4 gap-6 text-xs font-semibold text-slate-500 leading-relaxed">
              <div className="space-y-1">
                <p className="text-slate-800 font-extrabold">Resolution Rate (35%)</p>
                <p className="text-slate-400 font-medium">Calculated as the percentage of total reported complaints that have been successfully resolved by the department.</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-800 font-extrabold">Speed Score (25%)</p>
                <p className="text-slate-400 font-medium">Evaluates the average time taken to resolve issues compared to their assigned SLA deadlines. Faster resolutions yield maximum points.</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-800 font-extrabold">Happiness Score (25%)</p>
                <p className="text-slate-400 font-medium">Derived directly from citizen feedback mood inputs. Patient mood yields full score, unhappy is partial, and frustrated yields 0.</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-800 font-extrabold text-red-650">Escalation Penalty (15%)</p>
                <p className="text-slate-400 font-medium">A penalty deducted from the score for missed SLA deadlines, which trigger ticket escalation levels and priority upgrades.</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-5 pt-2">
          <button
            onClick={() => setActiveTab('national')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer ${
              activeTab === 'national'
                ? 'bg-[#041A3E] text-white border-[#041A3E] shadow-sm'
                : 'bg-white text-[#041A3E] border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            🇮🇳 National View
          </button>
          <button
            onClick={() => setActiveTab('state')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer ${
              activeTab === 'state'
                ? 'bg-[#041A3E] text-white border-[#041A3E] shadow-sm'
                : 'bg-white text-[#041A3E] border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            🏙️ State View
          </button>
          <button
            onClick={() => setActiveTab('constituency')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer ${
              activeTab === 'constituency'
                ? 'bg-[#041A3E] text-white border-[#041A3E] shadow-sm'
                : 'bg-white text-[#041A3E] border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            📍 Constituency View (Live)
          </button>
        </div>

        {/* TAB 1: National View */}
        {activeTab === 'national' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                    <th className="py-4 px-6 text-center w-16">Rank</th>
                    <th className="py-4 px-6">State Name</th>
                    <th className="py-4 px-6 min-w-[180px]">DAI Score</th>
                    <th className="py-4 px-6 text-center w-28">Grade</th>
                    <th className="py-4 px-6 text-center w-24">Trend</th>
                    <th className="py-4 px-6 text-right w-28">Resolved%</th>
                    <th className="py-4 px-6 text-right w-28">Happiness%</th>
                    <th className="py-4 px-6 text-right w-28">Escalations</th>
                    <th className="py-4 px-6 text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {nationalData.map((row) => (
                    <tr 
                      key={row.name}
                      className={`hover:bg-slate-50/50 transition-colors ${row.isLive ? 'bg-orange-50/30 font-medium' : ''}`}
                    >
                      <td className="py-4 px-6 text-center font-mono font-bold text-slate-500">{row.rank}</td>
                      <td className="py-4 px-6 font-bold text-slate-800 flex items-center gap-2">
                        {row.name}
                        {row.isLive && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-850 text-[10px] font-extrabold rounded-full animate-pulse border border-orange-200 uppercase tracking-wide">
                            🔴 LIVE
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold w-6 text-slate-700">{row.dai}</span>
                          <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden max-w-[150px] border border-slate-200">
                            <div 
                              className={`h-full rounded-full ${
                                row.dai >= 75 ? 'bg-green-600' : row.dai >= 60 ? 'bg-yellow-500' : row.dai >= 40 ? 'bg-orange-500' : 'bg-red-600'
                              }`} 
                              style={{ width: `${row.dai}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getGradeBadgeClass(row.grade)}`}>
                          {row.grade}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-center font-bold">
                        {row.trend === 'up' && <span className="text-green-600">↑ {row.trendValue}</span>}
                        {row.trend === 'same' && <span className="text-slate-400">→ {row.trendValue}</span>}
                        {row.trend === 'down' && <span className="text-red-500">↓ {row.trendValue}</span>}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-semibold text-slate-700">{row.resolved}%</td>
                      <td className="py-4 px-6 text-right font-mono font-semibold text-slate-700">{row.happiness}%</td>
                      <td className="py-4 px-6 text-right font-mono font-semibold text-slate-700">{row.escalation}%</td>
                      <td className="py-4 px-6 text-right font-mono text-slate-500">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: State View */}
        {activeTab === 'state' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm w-fit">
              <label className="text-xs font-bold text-slate-700 uppercase">Select State:</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white font-semibold text-slate-805 focus:outline-none"
              >
                <option value="Rajasthan">Rajasthan</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Karnataka">Karnataka</option>
              </select>
            </div>

            {selectedState === 'Rajasthan' ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                        <th className="py-4 px-6 text-center w-16">Rank</th>
                        <th className="py-4 px-6">City Name</th>
                        <th className="py-4 px-6 min-w-[180px]">DAI Score</th>
                        <th className="py-4 px-6 text-center w-28">Grade</th>
                        <th className="py-4 px-6 text-center w-24">Trend</th>
                        <th className="py-4 px-6 text-right w-28">Resolved%</th>
                        <th className="py-4 px-6 text-right w-28">Happiness%</th>
                        <th className="py-4 px-6 text-right w-28">Escalations</th>
                        <th className="py-4 px-6 text-right w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {rajasthanCities.map((row) => (
                        <tr 
                          key={row.name}
                          className={`hover:bg-slate-50/50 transition-colors ${row.isLive ? 'bg-orange-50/30 font-medium' : ''}`}
                        >
                          <td className="py-4 px-6 text-center font-mono font-bold text-slate-500">{row.rank}</td>
                          <td className="py-4 px-6 font-bold text-slate-800 flex items-center gap-2">
                            {row.name}
                            {row.isLive && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-850 text-[10px] font-extrabold rounded-full animate-pulse border border-orange-200 uppercase tracking-wide">
                                🔴 LIVE
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold w-6 text-slate-700">{row.dai}</span>
                              <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden max-w-[150px] border border-slate-200">
                                <div 
                                  className={`h-full rounded-full ${
                                    row.dai >= 75 ? 'bg-green-600' : row.dai >= 60 ? 'bg-yellow-500' : row.dai >= 40 ? 'bg-orange-500' : 'bg-red-600'
                                  }`} 
                                  style={{ width: `${row.dai}%` }} 
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getGradeBadgeClass(row.grade)}`}>
                              {row.grade}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-mono text-center font-bold">
                            {row.trend === 'up' && <span className="text-green-600">↑ {row.trendValue}</span>}
                            {row.trend === 'same' && <span className="text-slate-400">→ {row.trendValue}</span>}
                            {row.trend === 'down' && <span className="text-red-500">↓ {row.trendValue}</span>}
                          </td>
                          <td className="py-4 px-6 text-right font-mono font-semibold text-slate-700">{row.resolved}%</td>
                          <td className="py-4 px-6 text-right font-mono font-semibold text-slate-700">{row.happiness}%</td>
                          <td className="py-4 px-6 text-right font-mono font-semibold text-slate-700">{row.escalation}%</td>
                          <td className="py-4 px-6 text-right font-mono text-slate-500">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-550 text-sm font-semibold">
                No seed city metrics found for {selectedState}. Select Rajasthan to view live demo metrics.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Constituency View (LIVE DATA) */}
        {activeTab === 'constituency' && (
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Demo Constituency</span>
                <h3 className="font-extrabold text-slate-800 text-lg">Chittorgarh Urban, Rajasthan</h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  const currentTab = activeTab;
                  setActiveTab('national');
                  setTimeout(() => setActiveTab(currentTab), 10);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 text-xs rounded-lg shadow-sm transition-all cursor-pointer"
              >
                🔄 Refresh Stats
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-700 rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-slate-500">Querying real-time Supabase analytics...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm font-medium">
                ⚠️ {error}
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                {/* 4.1 Department Performance horizontal bar chart */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2 uppercase tracking-wider">
                    Department Performance — Chittorgarh (Live)
                  </h4>
                  <div className="space-y-4 pt-2">
                    {liveData.length === 0 ? (
                      <p className="text-xs text-slate-450 italic">No department complaints reported yet.</p>
                    ) : (
                      liveData.map((dept) => {
                        const metrics = computeDaiMetrics(dept);
                        
                        let gradeColor = 'bg-red-500';
                        let textCol = 'text-red-750 bg-red-50 border-red-200';
                        if (metrics.grade.startsWith('A')) {
                          gradeColor = 'bg-green-600';
                          textCol = 'text-green-700 bg-green-50 border-green-200';
                        } else if (metrics.grade.startsWith('B')) {
                          gradeColor = 'bg-yellow-500';
                          textCol = 'text-yellow-700 bg-yellow-50 border-yellow-200';
                        } else if (metrics.grade.startsWith('C')) {
                          gradeColor = 'bg-orange-500';
                          textCol = 'text-orange-700 bg-orange-50 border-orange-200';
                        }

                        return (
                          <div key={dept.department_id} className="flex items-center gap-4 text-xs font-semibold">
                            <span className="w-24 text-slate-700 truncate">{dept.department_name}</span>
                            <div className="flex-1 bg-slate-100 h-6 rounded-lg overflow-hidden border border-slate-200 relative">
                              <div
                                className={`${gradeColor} h-full rounded-l-lg transition-all duration-1000 ease-out`}
                                style={{ width: `${metrics.dai}%` }}
                              ></div>
                            </div>
                            <span className="font-mono text-slate-800 w-6 text-right">{metrics.dai}</span>
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-black w-8 text-center ${textCol}`}>
                              {metrics.grade}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Live DAI Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {liveData.map((dept) => (
                    <DAICard key={dept.department_id} dept={dept} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
