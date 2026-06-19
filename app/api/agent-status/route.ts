import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_status')
      .select('*')
      .order('agent_name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    console.error('Error fetching agent status:', err);
    return NextResponse.json({ data: null, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_name } = body;

    if (!agent_name) {
      return NextResponse.json({ data: null, error: 'agent_name is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('agent_status')
      .upsert({
        agent_name,
        last_seen: new Date().toISOString(),
        status: 'online',
      }, { onConflict: 'agent_name' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    console.error('Error updating agent status:', err);
    return NextResponse.json({ data: null, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
