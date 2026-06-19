import { NextRequest } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// Regex to check if ID is a valid UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return Response.json({ data: null, error: 'ID is required' }, { status: 400 });
    }

    const isUuid = UUID_REGEX.test(id);

    // Step 1: Query grievance details
    let query = supabase.from('grievances').select('*');
    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('grievance_id', id);
    }

    const { data: grievance, error: grievanceError } = await query.single();

    if (grievanceError || !grievance) {
      return Response.json({ data: null, error: 'Grievance not found' }, { status: 404 });
    }

    // Step 2: Query history log
    const { data: history, error: historyError } = await supabase
      .from('grievance_history')
      .select('*')
      .eq('grievance_id', grievance.id)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error('Error fetching history:', historyError);
    }

    return Response.json({
      data: {
        ...grievance,
        history: history || [],
      },
      error: null,
    }, { status: 200 });
  } catch (err: any) {
    console.error('Error getting single grievance:', err);
    return Response.json({ data: null, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
