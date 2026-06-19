'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { Grievance } from '@/lib/types';
import dynamic from 'next/dynamic';

const HomeMap = dynamic(() => import('@/components/HomeMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-50 flex items-center justify-center border border-slate-200 rounded-xl">
      <div className="flex flex-col items-center space-y-2">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-700 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-semibold">Loading interactive map...</p>
      </div>
    </div>
  )
});

export default function LandingHomePage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    avgHours: 0,
    overallDAI: 71,
    grade: 'B'
  });
  const [recentGrievances, setRecentGrievances] = useState<Grievance[]>([]);
  const [mapGrievances, setMapGrievances] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([24.8829, 74.6269]);
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Fetch live stats and recent activity on mount
  useEffect(() => {
    async function initLandingData() {
      try {
        setLoading(true);
        // 1. Fetch department stats from accountability endpoint to calculate totals
        const statsRes = await fetch('/api/accountability');
        const statsJson = await statsRes.json();

        // 2. Fetch recent reports from grievances endpoint
        const reportsRes = await fetch('/api/grievances');
        const reportsJson = await reportsRes.json();

        // 3. Fetch map grievances
        const mapRes = await fetch('/api/grievances/map');
        const mapJson = await mapRes.json();
        if (mapRes.ok && mapJson.data) {
          setMapGrievances(mapJson.data);
        }

        if (statsRes.ok && statsJson.data) {
          const depts = statsJson.data;
          let total = 0;
          let resolved = 0;
          let totalHours = 0;
          let resolvedCount = 0;
          let totalDai = 0;

          depts.forEach((dept: any) => {
            total += dept.total;
            resolved += dept.resolved;
            if (dept.resolved > 0) {
              totalHours += dept.avgHours * dept.resolved;
              resolvedCount += dept.resolved;
            }
            // Compute DAI locally
            const resolutionScore = dept.total > 0 ? (dept.resolved / dept.total) * 35 : 35;
            const speedRatio = dept.total > 0 && dept.resolved > 0 ? Math.max(0, 1 - (dept.avgHours / dept.slaHours)) : 1.0;
            const speedScore = speedRatio * 25;
            const moodMap: Record<string, number> = { patient: 1.0, unhappy: 0.4, frustrated: 0.0 };
            const avgMood = dept.moods.length > 0
              ? dept.moods.reduce((sum: number, m: string) => sum + (moodMap[m] ?? 0.6), 0) / dept.moods.length
              : 0.6;
            const happinessScore = avgMood * 25;
            const escalationPenalty = dept.total > 0 ? (dept.escalated / dept.total) * 15 : 0;
            
            const deptDai = resolutionScore + speedScore + happinessScore - escalationPenalty;
            totalDai += Math.max(0, Math.min(100, deptDai));
          });

          const avgHours = resolvedCount > 0 ? totalHours / resolvedCount : 0;
          const overallDAI = depts.length > 0 ? Math.round(totalDai / depts.length) : 75;

          const getGrade = (score: number) => {
            if (score >= 90) return 'A+';
            if (score >= 75) return 'A';
            if (score >= 60) return 'B';
            if (score >= 40) return 'C';
            return 'D';
          };

          setStats({
            total,
            resolved,
            avgHours: parseFloat(avgHours.toFixed(1)),
            overallDAI,
            grade: getGrade(overallDAI)
          });
        }

        if (reportsRes.ok && reportsJson.data) {
          setRecentGrievances(reportsJson.data.slice(0, 3));
        }
      } catch (err) {
        console.error('Error loading landing page data:', err);
      } finally {
        setLoading(false);
      }
    }

    initLandingData();
  }, []);

  // Geolocation handling
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedPermission = localStorage.getItem('geolocation_permission');
    const storedLat = localStorage.getItem('user_lat');
    const storedLng = localStorage.getItem('user_lng');

    if (storedPermission === 'granted' && storedLat && storedLng) {
      setMapCenter([parseFloat(storedLat), parseFloat(storedLng)]);
      setLocationStatus('Showing complaints near you');
    } else if (storedPermission === 'granted') {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setMapCenter([lat, lng]);
          localStorage.setItem('user_lat', lat.toString());
          localStorage.setItem('user_lng', lng.toString());
          setLocationStatus('Showing complaints near you');
        },
        () => {
          localStorage.setItem('geolocation_permission', 'denied');
        }
      );
    } else if (storedPermission === 'denied') {
      // defaults to Chittorgarh
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setMapCenter([lat, lng]);
          localStorage.setItem('geolocation_permission', 'granted');
          localStorage.setItem('user_lat', lat.toString());
          localStorage.setItem('user_lng', lng.toString());
          setLocationStatus('Showing complaints near you');
        },
        (error) => {
          localStorage.setItem('geolocation_permission', 'denied');
        }
      );
    }
  }, []);

  // Format date helper
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-slate-100 text-slate-700';
      case 'AI_VERIFIED': return 'bg-blue-100 text-blue-700';
      case 'ROUTED': return 'bg-indigo-100 text-indigo-700';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* 1. Hero Banner Section */}
      <section className="bg-[#041A3E] text-white py-20 px-8 w-full border-b border-slate-800 relative overflow-hidden">
        {/* Background decorative seals */}
        <div className="absolute right-0 bottom-0 opacity-[0.03] text-[300px] font-bold select-none translate-y-1/4 translate-x-1/4">
          🏛️
        </div>
        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <span className="px-3 py-1 bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-bold uppercase tracking-widest rounded-full">
            🇮🇳 Government Technology Portal
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight max-w-3xl">
            {t('home.hero_title')}
          </h2>
          <p className="text-white/80 text-base md:text-lg leading-relaxed max-w-3xl">
            {t('home.hero_subtitle')}
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/report"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl text-base transition-all shadow-md flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
            >
              <span>📍</span> {t('home.cta_report')}
            </Link>
            <Link
              href="/track"
              className="bg-transparent hover:bg-white/10 text-white font-bold px-8 py-4 rounded-xl text-base border border-white/30 transition-all flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
            >
              <span>🔍</span> {t('home.cta_track')}
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Accountability Index Quick Widget */}
      <section className="max-w-6xl w-full mx-auto px-4 -mt-10 relative z-20">
        <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <h3 className="font-extrabold text-slate-800 text-lg">{t('home.stats_title')}</h3>
            </div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Chittorgarh Urban, Rajasthan
            </p>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md">
              Our department performances are evaluated dynamically by speed score, resolution rate, and public feedback.
            </p>
          </div>

          <div className="flex items-center gap-4 border-l border-slate-100 pl-0 md:pl-6">
            <div className="bg-[#041A3E]/5 p-3.5 rounded-2xl flex items-center justify-center font-bold text-[#041A3E] text-2xl w-14 h-14">
              🏛️
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Index Score</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-2xl font-extrabold text-slate-800">{stats.overallDAI}</span>
                <span className="text-slate-400 text-xs">/100</span>
                <span className={`ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                  stats.grade.startsWith('A') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}>
                  Grade {stats.grade}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 border-l border-slate-100 pl-0 md:pl-6">
            <Link
              href="/accountability"
              className="w-full bg-[#041A3E] hover:bg-[#0a2652] text-white text-center font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
            >
              View Performance Index →
            </Link>
            <div className="text-[10px] text-slate-400 text-center font-medium mt-1">
              Live database audits linked
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section className="max-w-6xl w-full mx-auto px-4 py-16 space-y-12">
        <div className="text-center space-y-2">
          <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {t('home.how_title')}
          </h3>
          <p className="text-slate-500 text-sm max-w-2xl mx-auto leading-relaxed">
            {t('home.how_subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { title: t('home.step1_title'), desc: t('home.step1_desc'), icon: '📍', color: 'border-t-blue-500' },
            { title: t('home.step2_title'), desc: t('home.step2_desc'), icon: '👁️', color: 'border-t-indigo-500' },
            { title: t('home.step3_title'), desc: t('home.step3_desc'), icon: '⚡', color: 'border-t-yellow-500' },
            { title: t('home.step4_title'), desc: t('home.step4_desc'), icon: '🔐', color: 'border-t-green-500' },
          ].map((step) => (
            <div
              key={step.title}
              className={`bg-white rounded-xl shadow-sm border border-slate-200 border-t-4 ${step.color} p-6 space-y-3 hover:shadow-md transition-all h-full`}
            >
              <span className="text-3xl block">{step.icon}</span>
              <h4 className="font-bold text-slate-800 text-base">{step.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3.5 Live Complaint Map Section */}
      <section className="bg-white border-t border-b border-slate-200 py-16 w-full">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                Live Complaint Map — {locationStatus ? 'Near You' : 'Chittorgarh'}
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                Showing {mapGrievances.length} open issues {locationStatus ? 'near you' : 'in Chittorgarh'}
              </p>
            </div>
            {/* Category legends */}
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span> Roads</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span> Water</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#D97706]"></span> Electricity</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#6B7280]"></span> Others</span>
            </div>
          </div>
          
          <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
            <HomeMap center={mapCenter} grievances={mapGrievances} />
          </div>
          <p className="text-slate-400 text-xs italic text-center">
            Click any pin to inspect the issue category, severity, status, and reporting timeline. Citizen privacy is strictly protected.
          </p>
        </div>
      </section>

      {/* 4. Live Grievance Feed */}
      <section className="bg-slate-100/50 border-t border-b border-slate-200 py-16 w-full">
        <div className="max-w-6xl mx-auto px-4 space-y-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                {t('home.recent_title')}
              </h3>
              <p className="text-slate-500 text-xs md:text-sm mt-1">
                {t('home.recent_subtitle')}
              </p>
            </div>
            <Link
              href="/track"
              className="text-xs text-blue-600 hover:text-blue-800 font-extrabold tracking-wide uppercase transition-all"
            >
              Track Another Reference →
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-700 rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400 font-semibold">Fetching recent citizen complaints...</p>
            </div>
          ) : recentGrievances.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Default beautiful demonstration cards */}
              {[
                {
                  grievance_id: 'GRV-2026-POT9A1B2',
                  category: 'Roads',
                  description: 'Large broken asphalt pothole on main Station Road causing vehicle hazards.',
                  status: 'RESOLVED',
                  created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
                  citizen_name: 'Amit Patel'
                },
                {
                  grievance_id: 'GRV-2026-WTR3F9G8',
                  category: 'Water Supply',
                  description: 'Leaking water main pipe flooding adjacent pedestrian footpaths near Fort Link.',
                  status: 'IN_PROGRESS',
                  created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
                  citizen_name: 'Sunita Vyas'
                },
                {
                  grievance_id: 'GRV-2026-POW8D2E4',
                  category: 'Electricity',
                  description: 'Sparking transmission transformer with loose electrical wire cables overhead.',
                  status: 'ROUTED',
                  created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
                  citizen_name: 'Rajesh Sharma'
                }
              ].map((mock) => (
                <div key={mock.grievance_id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 hover:shadow-sm transition-all">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-slate-800">{mock.grievance_id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadgeColor(mock.status)}`}>
                      {mock.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">{mock.category}</span>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-semibold">{mock.description}</p>
                  </div>
                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                    <span>Citizen: {mock.citizen_name}</span>
                    <span>{formatDate(mock.created_at)}</span>
                  </div>
                  <Link
                    href={`/track/${mock.grievance_id}`}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-[#041A3E] text-center font-bold py-2 rounded-lg text-[10px] transition-all block border border-slate-100"
                  >
                    Inspect Audit Log →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentGrievances.map((g) => (
                <div key={g.grievance_id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 hover:shadow-sm transition-all">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-slate-800">{g.grievance_id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadgeColor(g.status)}`}>
                      {g.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">{g.category}</span>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-semibold">{g.description}</p>
                  </div>
                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                    <span>Citizen: {g.citizen_name}</span>
                    <span>{formatDate(g.created_at)}</span>
                  </div>
                  <Link
                    href={`/track/${g.grievance_id}`}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-[#041A3E] text-center font-bold py-2 rounded-lg text-[10px] transition-all block border border-slate-100"
                  >
                    Inspect Audit Log →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
