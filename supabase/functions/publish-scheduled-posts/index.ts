import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log('Starting scheduled posts check...');

    // Get all scheduled posts that should be published now
    const now = new Date().toISOString();
    const { data: scheduledPosts, error: fetchError } = await supabaseClient
      .from('posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    if (fetchError) {
      console.error('Error fetching scheduled posts:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${scheduledPosts?.length || 0} posts ready to publish`);

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No posts to publish',
        publishedCount: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update all ready posts to published
    const postIds = scheduledPosts.map(post => post.id);
    const { error: updateError } = await supabaseClient
      .from('posts')
      .update({
        status: 'published',
        created_at: now,
        scheduled_at: null
      })
      .in('id', postIds);

    if (updateError) {
      console.error('Error updating posts:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully published ${scheduledPosts.length} posts`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Published ${scheduledPosts.length} posts`,
      publishedCount: scheduledPosts.length,
      publishedPostIds: postIds
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});