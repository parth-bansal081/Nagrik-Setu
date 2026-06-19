import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. Total complaints
    const { count: total, error: err1 } = await supabaseAdmin
      .from('grievances')
      .select('*', { count: 'exact', head: true });
    if (err1) throw err1;

    // 2. Pending complaints
    const { count: pending, error: err2 } = await supabaseAdmin
      .from('grievances')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');
    if (err2) throw err2;

    // 3. Resolved today (resolved_at >= today midnight)
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const { count: resolvedToday, error: err3 } = await supabaseAdmin
      .from('grievances')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'RESOLVED')
      .gte('resolved_at', todayMidnight.toISOString());
    if (err3) throw err3;

    // 4. Escalated (escalation_level > 0 AND status != 'RESOLVED')
    const { count: escalated, error: err4 } = await supabaseAdmin
      .from('grievances')
      .select('*', { count: 'exact', head: true })
      .gt('escalation_level', 0)
      .neq('status', 'RESOLVED');
    if (err4) throw err4;

    return NextResponse.json({
      data: {
        total: total || 0,
        pending: pending || 0,
        resolvedToday: resolvedToday || 0,
        escalated: escalated || 0,
      },
      error: null
    });
  } catch (err: any) {
    console.error('Error fetching admin stats:', err);
    return NextResponse.json({ data: null, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
