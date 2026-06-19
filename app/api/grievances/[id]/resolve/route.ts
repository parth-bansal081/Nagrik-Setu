import { NextRequest } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { afterPhotoBase64, adminLat, adminLng } = await request.json();

    if (!afterPhotoBase64 || adminLat === undefined || adminLng === undefined) {
      return Response.json({ data: null, error: 'Missing required fields (afterPhotoBase64, adminLat, adminLng)' }, { status: 400 });
    }

    const isUuid = UUID_REGEX.test(id);

    // Step 1: Find the grievance record
    let query = supabase.from('grievances').select('*');
    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('grievance_id', id);
    }
    const { data: grievance, error: findError } = await query.single();

    if (findError || !grievance) {
      return Response.json({ data: null, error: 'Grievance not found' }, { status: 404 });
    }

    // Step 2: Upload after-photo to Supabase Storage
    const base64Data = afterPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const imagePath = `after/${grievance.grievance_id}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('grievance-images')
      .upload(imagePath, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error for after-photo:', uploadError);
      return Response.json({ data: null, error: 'Failed to upload after-photo' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('grievance-images')
      .getPublicUrl(imagePath);

    // Step 3: Update the resolution coordinates and photo URL in database
    const { error: updateError } = await supabase
      .from('grievances')
      .update({
        after_image_url: publicUrl,
        resolution_lat: parseFloat(adminLat),
        resolution_lng: parseFloat(adminLng),
      })
      .eq('id', grievance.id);

    if (updateError) {
      throw updateError;
    }

    // Record the resolution attempt in the history
    await supabase.from('grievance_history').insert({
      grievance_id: grievance.id,
      event: 'RESOLUTION_ATTEMPTED',
      actor: 'ADMIN',
      metadata: { latitude: adminLat, longitude: adminLng, after_image_url: publicUrl },
    });

    // Step 4: Trigger Verification Agent via Band HTTP API
    const bandApiUrl = process.env.BAND_API_BASE_URL || 'https://app.band.ai';
    const verificationAgentId = process.env.BAND_VERIFICATION_AGENT_ID;
    const verificationApiKey = process.env.BAND_VERIFICATION_API_KEY;
    const routingApiKey = process.env.BAND_ROUTING_API_KEY || verificationApiKey || '';
    let targetRoomId = '';

    if (verificationAgentId && verificationApiKey) {
      try {
        // List agent chats to find the correct room
        const listChatsResponse = await fetch(`${bandApiUrl}/api/v1/agent/chats`, {
          method: 'GET',
          headers: {
            'X-API-Key': routingApiKey,
          },
        });

        if (listChatsResponse.ok) {
          const chatsData = await listChatsResponse.json();
          const rooms = chatsData.data || [];
          const matchRoom = rooms.find((r: any) => r.title && r.title.includes(grievance.grievance_id));
          if (matchRoom) {
            targetRoomId = matchRoom.id;
          }
        }
      } catch (err) {
        console.error('Error finding Band room:', err);
      }

      // If we found a room, send a message to trigger verification
      if (targetRoomId) {
        try {
          await fetch(`${bandApiUrl}/api/v1/agent/chats/${targetRoomId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': routingApiKey,
            },
            body: JSON.stringify({
              message: {
                content: `@verification_agent Admin has requested resolution. Verify the after-photo and GPS.`,
                mentions: [
                  { id: verificationAgentId },
                ],
              },
            }),
          });
        } catch (postErr) {
          console.error('Error sending message to verification agent:', postErr);
        }
      } else {
        console.warn('Could not find corresponding Band room to trigger Verification Agent.');
      }
    }

    // Step 5: Poll Supabase for verification result (sync-over-async)
    let success = false;
    let errorMessage = 'Verification timeout. The agent is still processing the request.';

    for (let i = 0; i < 20; i++) { // Poll 20 times (every 500ms) = 10 seconds max
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: currentGriv } = await supabase
        .from('grievances')
        .select('status')
        .eq('id', grievance.id)
        .single();

      if (currentGriv?.status === 'RESOLVED') {
        success = true;
        break;
      }

      // Check for failure event in history
      const { data: latestHistory } = await supabase
        .from('grievance_history')
        .select('event, metadata')
        .eq('grievance_id', grievance.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (latestHistory && latestHistory.length > 0) {
        if (latestHistory[0].event === 'RESOLUTION_FAILED') {
          success = false;
          errorMessage = latestHistory[0].metadata?.reason || 'After-photo or location check failed.';
          break;
        }
      }
    }

    if (success) {
      return Response.json({ data: { success: true, message: 'Grievance successfully resolved.' }, error: null }, { status: 200 });
    } else {
      return Response.json({ data: null, error: errorMessage }, { status: 422 });
    }
  } catch (err: any) {
    console.error('Error handling resolve POST:', err);
    return Response.json({ data: null, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    if (!status || !['PENDING', 'AI_VERIFIED', 'ROUTED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'REJECTED'].includes(status)) {
      return Response.json({ data: null, error: 'Invalid status value' }, { status: 400 });
    }

    const isUuid = UUID_REGEX.test(id);

    let query = supabase.from('grievances').select('id');
    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('grievance_id', id);
    }
    const { data: grievance, error: findError } = await query.single();

    if (findError || !grievance) {
      return Response.json({ data: null, error: 'Grievance not found' }, { status: 404 });
    }

    // Direct PATCH status change (for Non-resolved statuses like In Progress)
    const { data: updatedGrievance, error: updateError } = await supabase
      .from('grievances')
      .update({ status })
      .eq('id', grievance.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log in history
    await supabase.from('grievance_history').insert({
      grievance_id: grievance.id,
      event: `STATUS_UPDATED_${status}`,
      actor: 'ADMIN',
      metadata: { status },
    });

    return Response.json({ data: updatedGrievance, error: null }, { status: 200 });
  } catch (err: any) {
    console.error('Error patching grievance status:', err);
    return Response.json({ data: null, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
