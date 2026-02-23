import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioUrl, jobId } = await req.json();

    // If jobId is provided, check status (polling)
    if (jobId) {
      // In production, check job status from database/queue
      // For demo, return completed with mock data
      return new Response(
        JSON.stringify({
          status: 'completed',
          transcript: {
            id: jobId,
            audioTrackId: 'audio-1',
            status: 'completed',
            language: 'en',
            segments: [
              { id: '1', text: 'Hello and welcome.', start: 0, end: 2, confidence: 0.95 },
              { id: '2', text: 'This is a sample transcription.', start: 2, end: 5, confidence: 0.92 },
            ],
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start new transcription job
    if (!audioUrl) {
      return new Response(
        JSON.stringify({ error: 'audioUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting transcription for:', audioUrl);

    // In production, you would:
    // 1. Queue the transcription job (using Whisper API, AssemblyAI, etc.)
    // 2. Store job in database
    // 3. Return jobId for polling

    const newJobId = `job_${Date.now()}`;

    // For demo, return mock processing status
    return new Response(
      JSON.stringify({
        jobId: newJobId,
        status: 'processing',
        message: 'Transcription started. Poll with jobId to get results.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Transcription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Transcription failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
