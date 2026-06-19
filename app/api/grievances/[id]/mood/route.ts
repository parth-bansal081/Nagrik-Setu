import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { mood } = await request.json();

    if (!mood || !['frustrated', 'unhappy', 'patient'].includes(mood)) {
      return Response.json({ data: null, error: 'Invalid mood value. Must be frustrated, unhappy, or patient' }, { status: 400 });
    }

    const isUuid = UUID_REGEX.test(id);

    // Find the grievance first
    let query = supabase.from('grievances').select('id, grievance_id');
    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('grievance_id', id);
    }
    const { data: grievance, error: findError } = await query.single();

    if (findError || !grievance) {
      return Response.json({ data: null, error: 'Grievance not found' }, { status: 404 });
    }

    // Determine if high priority flag is triggered
    const isHighPriority = ['frustrated', 'unhappy'].includes(mood);

    // Update grievance
    const { data: updatedGrievance, error: updateError } = await supabase
      .from('grievances')
      .update({
        citizen_mood: mood,
        is_high_priority: isHighPriority,
      })
      .eq('id', grievance.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Record event to history
    await supabase.from('grievance_history').insert({
      grievance_id: grievance.id,
      event: 'MOOD_UPDATED',
      actor: 'CITIZEN',
      metadata: { mood, is_high_priority: isHighPriority },
    });

    return Response.json({ data: updatedGrievance, error: null }, { status: 200 });
  } catch (err: any) {
    console.error('Error updating mood:', err);
    return Response.json({ data: null, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
