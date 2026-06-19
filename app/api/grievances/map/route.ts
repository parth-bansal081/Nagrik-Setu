import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('grievances')
      .select('id, grievance_id, latitude, longitude, category, ai_severity, status, created_at')
      .in('status', ['PENDING', 'AI_VERIFIED', 'ROUTED', 'IN_PROGRESS', 'ESCALATED']);

    if (error) throw error;

    const formattedData = (data || []).map((g) => ({
      id: g.id,
      grievance_id: g.grievance_id,
      latitude: g.latitude,
      longitude: g.longitude,
      category: g.category,
      severity: g.ai_severity || 'Low',
      status: g.status,
      created_at: g.created_at,
    }));

    return NextResponse.json({ data: formattedData, error: null });
  } catch (err: any) {
    console.error('Error fetching map grievances:', err);
    return NextResponse.json({ data: null, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
