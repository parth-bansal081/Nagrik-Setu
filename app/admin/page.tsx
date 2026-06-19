'use client';

import { useState, useEffect } from 'react';
import GrievanceTable from '@/components/GrievanceTable';
import { Grievance } from '@/lib/types';

export default function AdminPage() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Analytics Stats state
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    resolvedToday: 0,
    escalated: 0,
  });

  // Agent Status state
  const [agents, setAgents] = useState<any[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  const fetchGrievances = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/grievances');
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch grievances.');
      }
      
      setGrievances(json.data || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatsAndAgents = async () => {
    try {
      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        if (statsJson.data) {
          setStats(statsJson.data);
        }
      }

      const agentsRes = await fetch('/api/agent-status');
      if (agentsRes.ok) {
        const agentsJson = await agentsRes.json();
        if (agentsJson.data) {
          setAgents(agentsJson.data);
        }
      }
    } catch (err) {
      console.error('Error fetching admin header stats / agent heartbeats:', err);
    } finally {
      setAgentsLoading(false);
    }
  };

  useEffect(() => {
    fetchGrievances();
    fetchStatsAndAgents();
    
    // Auto refresh stats/agents panel every 30 seconds
    const interval = setInterval(fetchStatsAndAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/grievances/${id}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update status.');
      }

      fetchGrievances();
      fetchStatsAndAgents();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleResolveAttempt = async (id: string, afterPhotoBase64: string, lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/grievances/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          afterPhotoBase64,
          adminLat: lat,
          adminLng: lng,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        return { success: false, error: json.error || 'Resolution verification failed.' };
      }

      fetchGrievances();
      fetchStatsAndAgents();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred during verification.' };
    }
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setDeptFilter('all');
    setSearchQuery('');
  };

  // Perform client-side filtering
  const filteredGrievances = grievances.filter((g) => {
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
    const matchesDept = deptFilter === 'all' || g.department_id === deptFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      g.grievance_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.citizen_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesDept && matchesSearch;
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'IN_PROGRESS': return 'In Progress';
      case 'RESOLVED': return 'Resolved';
      default: return 'All';
    }
  };

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 120000; // online if active within last 2 minutes
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'Not connected';
    const diff = Date.now() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hrs ago`;
    return new Date(lastSeen).toLocaleDateString();
  };

  const formatAgentName = (name: string) => {
    return name
      .replace('_', ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  if (loading && grievances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 flex-1">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-700 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500">Loading admin dashboard grievances...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row w-full min-h-screen">
      {/* 250px Left Sidebar */}
      <aside className="w-full md:w-[250px] bg-white border-r border-slate-200 p-6 flex flex-col gap-8 shrink-0">
        {/* Status Filter Section */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Filter by Status
          </h4>
          <ul className="space-y-2 text-sm font-semibold">
            {[
              { id: 'all', label: 'All Statuses' },
              { id: 'PENDING', label: 'Pending' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'RESOLVED', label: 'Resolved' },
            ].map((opt) => (
              <li key={opt.id}>
                <button
                  onClick={() => setStatusFilter(opt.id)}
                  className={`w-full text-left py-1.5 px-3 rounded-lg flex items-center gap-2.5 transition-all cursor-pointer ${
                    statusFilter === opt.id
                      ? 'bg-slate-100 text-slate-850'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs">
                    {statusFilter === opt.id ? '●' : '○'}
                  </span>
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Department Filter Section */}
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Filter by Department
          </h4>
          <ul className="space-y-2 text-sm font-semibold">
            {[
              { id: 'all', label: 'All Departments' },
              { id: 'PWD', label: 'PWD (Roads)' },
              { id: 'JAL_SHAKTI', label: 'Jal Shakti (Water)' },
              { id: 'DISCOM', label: 'DISCOM (Electricity)' },
              { id: 'GENERAL', label: 'General Admin' },
            ].map((opt) => (
              <li key={opt.id}>
                <button
                  onClick={() => setDeptFilter(opt.id)}
                  className={`w-full text-left py-1.5 px-3 rounded-lg flex items-center gap-2.5 transition-all cursor-pointer ${
                    deptFilter === opt.id
                      ? 'bg-slate-100 text-slate-850'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs">
                    {deptFilter === opt.id ? '●' : '○'}
                  </span>
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main content pane */}
      <main className="flex-1 bg-slate-50 p-6 md:p-8 space-y-6 flex flex-col">
        {/* Top Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="font-extrabold text-slate-800 text-2xl tracking-tight flex items-center gap-2">
              {statusFilter === 'all' ? 'All' : getStatusLabel(statusFilter)} Grievances
            </h2>
            <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">
              {filteredGrievances.length} cases found
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchGrievances();
                fetchStatsAndAgents();
              }}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-755 font-bold border border-slate-200 text-xs rounded-lg shadow-sm transition-all cursor-pointer"
            >
              🔄 Refresh List
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-755 font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-medium shrink-0">
            ⚠️ {error}
          </div>
        )}

        {/* 5.1 Analytics Cards Header */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          {[
            { label: 'Total', count: stats.total, desc: 'complaints reported', color: 'border-t-blue-500' },
            { label: 'Pending', count: stats.pending, desc: 'awaiting verification/resolution', color: 'border-t-yellow-500' },
            { label: 'Today Resolved', count: stats.resolvedToday, desc: 'cases closed today', color: 'border-t-green-500' },
            { label: 'Escalated', count: stats.escalated, desc: 'cases needing attention', color: 'border-t-red-500', pulse: stats.escalated > 0 },
          ].map((stat, idx) => (
            <div
              key={idx}
              className={`bg-white rounded-xl shadow-sm border border-slate-200 border-t-4 ${stat.color} p-4 space-y-1`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{stat.label}</span>
              <div className="flex items-baseline gap-1.5">
                <span className={`font-mono text-2xl font-extrabold text-slate-800 ${stat.pulse ? 'text-red-600 animate-pulse' : ''}`}>
                  {stat.count}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">{stat.desc}</p>
            </div>
          ))}
        </div>

        {/* 5.2 Agent Status Monitor Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 shrink-0 space-y-3">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            BAND AGENT STATUS MONITOR
          </span>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['vision_agent', 'routing_agent', 'watchdog_agent', 'verification_agent'].map((agentName) => {
              const dbAgent = agents.find((a) => a.agent_name === agentName);
              const active = dbAgent ? isOnline(dbAgent.last_seen) : false;
              
              let indicator = '🔴';
              let statusLabel = 'Offline';
              let statusDesc = 'Not connected';
              let borderCol = 'border-slate-100';

              if (active) {
                if (agentName === 'watchdog_agent') {
                  indicator = '🟡';
                  statusLabel = 'Idle';
                  statusDesc = 'Next run: 3 min';
                  borderCol = 'border-yellow-200 bg-yellow-50/20';
                } else {
                  indicator = '🟢';
                  statusLabel = 'Online';
                  statusDesc = `Last active: ${formatLastSeen(dbAgent.last_seen)}`;
                  borderCol = 'border-green-200 bg-green-50/20';
                }
              } else if (dbAgent) {
                statusDesc = `Last active: ${formatLastSeen(dbAgent.last_seen)}`;
              }

              return (
                <div key={agentName} className={`border rounded-lg p-3 flex items-center justify-between text-xs ${borderCol}`}>
                  <div>
                    <p className="font-bold text-slate-700">{formatAgentName(agentName)}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{statusDesc}</p>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-slate-600 uppercase text-[10px]">
                    <span>{indicator}</span> {statusLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="w-full relative shrink-0">
          <input
            type="text"
            placeholder="Search by ID, citizen name, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
          />
          <span className="absolute left-3.5 top-3.5 text-slate-400">🔍</span>
        </div>

        {/* Dashboard table display */}
        <div className="flex-1">
          <GrievanceTable
            grievances={filteredGrievances}
            onStatusUpdate={handleStatusUpdate}
            onResolveAttempt={handleResolveAttempt}
          />
        </div>
      </main>
    </div>
  );
}
