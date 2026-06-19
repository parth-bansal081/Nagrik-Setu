import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Fetch all grievances where department_id is not null
    const { data: grievances, error } = await supabaseAdmin
      .from('grievances')
      .select('department_id, status, escalation_level, created_at, resolved_at, citizen_mood')
      .not('department_id', 'is', null);

    if (error) {
      throw error;
    }

    const departments = ['PWD', 'JAL_SHAKTI', 'DISCOM', 'GENERAL'];
    
    const slaHours: Record<string, number> = {
      PWD: 72,
      JAL_SHAKTI: 24,
      DISCOM: 48,
      GENERAL: 96,
    };

    const departmentNames: Record<string, string> = {
      PWD: 'PWD — Roads',
      JAL_SHAKTI: 'Jal Shakti — Water Supply',
      DISCOM: 'DISCOM — Electricity',
      GENERAL: 'General Administration',
    };

    // Initialize stats
    const stats = departments.map(deptId => {
      const deptGrievances = grievances?.filter(g => g.department_id === deptId) || [];
      const total = deptGrievances.length;
      const resolved = deptGrievances.filter(g => g.status === 'RESOLVED').length;
      const escalated = deptGrievances.filter(g => (g.escalation_level || 0) > 0).length;
      
      // Calculate avg resolution time in hours
      const resolvedGrievances = deptGrievances.filter(g => g.status === 'RESOLVED' && g.resolved_at && g.created_at);
      let totalHours = 0;
      resolvedGrievances.forEach(g => {
        const created = new Date(g.created_at).getTime();
        const resolvedTime = new Date(g.resolved_at!).getTime();
        const hours = (resolvedTime - created) / (1000 * 60 * 60);
        totalHours += Math.max(0, hours);
      });
      const avgHours = resolvedGrievances.length > 0 ? totalHours / resolvedGrievances.length : 0;

      // Extract citizen moods
      const moods = deptGrievances
        .map(g => g.citizen_mood)
        .filter((mood): mood is string => !!mood);

      return {
        department_id: deptId,
        department_name: departmentNames[deptId],
        total,
        resolved,
        escalated,
        avgHours: parseFloat(avgHours.toFixed(1)),
        moods,
        slaHours: slaHours[deptId],
      };
    });

    return Response.json({ data: stats, error: null }, { status: 200 });
  } catch (err: any) {
    console.error('Error generating accountability stats:', err);
    return Response.json({ data: null, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
