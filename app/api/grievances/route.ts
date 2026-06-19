import { NextRequest } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { Grievance } from '@/lib/types';

// Helper to generate custom human-readable Grievance ID: GRV-2026-XXXXXXXX
function generateGrievanceId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GRV-2026-${randomPart}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, lat, lng, category, description, imageBase64, address_text, address_city, address_pincode } = body;

    // Validate required fields
    if (!name || !phone || lat === undefined || lng === undefined || !category || !description || !imageBase64) {
      return Response.json(
        { data: null, error: 'Missing required fields (name, phone, lat, lng, category, description, imageBase64)' },
        { status: 400 }
      );
    }

    // Step 1: Spatial Deduplication check via PostGIS RPC check_spatial_duplicate
    const { data: duplicateData, error: duplicateError } = await supabaseAdmin.rpc('check_spatial_duplicate', {
      p_category: category,
      p_longitude: parseFloat(lng),
      p_latitude: parseFloat(lat),
    });

    if (duplicateError) {
      console.error('Deduplication check error:', duplicateError);
    }

    // If duplicate found within 100m
    if (duplicateData && duplicateData.length > 0) {
      const masterTicket = duplicateData[0];

      // Insert this duplicate record to keep log of citizen reports, linking to the master ticket
      const dupGrievanceId = generateGrievanceId();
      const { data: newDup, error: dupInsertError } = await supabaseAdmin
        .from('grievances')
        .insert({
          grievance_id: dupGrievanceId,
          citizen_name: name,
          citizen_phone: phone,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          category: category,
          description: description,
          is_duplicate: true,
          master_ticket_id: masterTicket.id,
          status: 'PENDING',
          address_text: address_text || null,
          address_city: address_city || null,
          address_pincode: address_pincode || null,
        })
        .select()
        .single();

      if (dupInsertError) {
        throw dupInsertError;
      }

      // Add to grievance history
      await supabaseAdmin.from('grievance_history').insert({
        grievance_id: newDup.id,
        event: 'SUBMITTED',
        actor: 'CITIZEN',
        metadata: { duplicate: true, master_grievance_id: masterTicket.grievance_id },
      });

      return Response.json({
        data: {
          linked: true,
          master_id: masterTicket.id,
          grievance_id: masterTicket.grievance_id,
          message: 'This issue is already being tracked. Your report has been linked.',
        },
        error: null,
      }, { status: 200 });
    }

    // Step 2: Generate Unique Grievance ID and upload image
    const grievance_id = generateGrievanceId();
    
    // Convert base64 to buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const imagePath = `before/${grievance_id}.jpg`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('grievance-images')
      .upload(imagePath, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return Response.json({ data: null, error: 'Failed to upload image' }, { status: 500 });
    }

    // Get public URL of the uploaded image
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('grievance-images')
      .getPublicUrl(imagePath);

    // Step 3: Insert grievance record into Supabase
    const { data: newGrievance, error: insertError } = await supabaseAdmin
      .from('grievances')
      .insert({
        grievance_id: grievance_id,
        citizen_name: name,
        citizen_phone: phone,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        category: category,
        description: description,
        image_url: publicUrl,
        status: 'PENDING',
        address_text: address_text || null,
        address_city: address_city || null,
        address_pincode: address_pincode || null,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Step 4: Write to history
    await supabaseAdmin.from('grievance_history').insert({
      grievance_id: newGrievance.id,
      event: 'SUBMITTED',
      actor: 'CITIZEN',
      metadata: {},
    });

    // Step 5: Trigger Vision Agent via Band HTTP API
    const bandApiUrl = process.env.BAND_API_BASE_URL || 'https://app.band.ai';
    const visionAgentId = process.env.BAND_VISION_AGENT_ID;
    const routingAgentId = process.env.BAND_ROUTING_AGENT_ID;
    const verificationAgentId = process.env.BAND_VERIFICATION_AGENT_ID;
    const routingAgentApiKey = process.env.BAND_ROUTING_API_KEY || process.env.BAND_VISION_API_KEY || '';

    if (visionAgentId && routingAgentApiKey) {
      try {
        // Create a chat room for this grievance
        const chatResponse = await fetch(`${bandApiUrl}/api/v1/agent/chats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': routingAgentApiKey,
          },
          body: JSON.stringify({
            chat: {
              title: `Grievance Room ${grievance_id}`,
            },
          }),
        });

        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          const roomId = chatData.data.id;

          // Add Vision Agent as participant if Routing Agent created the room
          if (process.env.BAND_ROUTING_API_KEY && visionAgentId) {
            await fetch(`${bandApiUrl}/api/v1/agent/chats/${roomId}/participants`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': routingAgentApiKey,
              },
              body: JSON.stringify({
                participant: {
                  participant_id: visionAgentId,
                },
              }),
            });
          }

          // Add Verification Agent as participant
          if (verificationAgentId) {
            await fetch(`${bandApiUrl}/api/v1/agent/chats/${roomId}/participants`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': routingAgentApiKey,
              },
              body: JSON.stringify({
                participant: {
                  participant_id: verificationAgentId,
                },
              }),
            });
          }

          // Trigger vision agent with a message
          await fetch(`${bandApiUrl}/api/v1/agent/chats/${roomId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': routingAgentApiKey,
            },
            body: JSON.stringify({
              message: {
                content: `@vision_agent New grievance registered. ID: ${grievance_id}. Analyze the photo.`,
                mentions: [
                  { id: visionAgentId },
                ],
              },
            }),
          });
        } else {
          console.error('Failed to create Band room:', await chatResponse.text());
        }
      } catch (bandErr) {
        console.error('Error triggering Vision Agent via Band:', bandErr);
      }
    } else {
      console.warn('Band Agent ID or API Key is missing. Skipping trigger.');
    }

    return Response.json({ data: newGrievance, error: null }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating grievance:', err);
    return Response.json({ data: null, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const status = searchParams.get('status');

    let query = supabaseAdmin.from('grievances').select('*');

    if (department && department !== 'all') {
      query = query.eq('department_id', department);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Default sorting defined in SCHEMA
    query = query
      .order('is_high_priority', { ascending: false })
      .order('escalation_level', { ascending: false })
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ data, error: null }, { status: 200 });
  } catch (err: any) {
    console.error('Error fetching grievances:', err);
    return Response.json({ data: null, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
