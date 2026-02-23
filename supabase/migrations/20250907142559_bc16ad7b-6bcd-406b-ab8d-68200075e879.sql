-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to publish scheduled posts every minute
SELECT cron.schedule(
  'publish-scheduled-posts',
  '* * * * *', -- every minute
  $$
  SELECT
    net.http_post(
      url := 'https://ojdhztcetykgvrcwlwen.supabase.co/functions/v1/publish-scheduled-posts',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZGh6dGNldHlrZ3ZyY3dsd2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMjA4NDIsImV4cCI6MjA3MjU5Njg0Mn0.PduCJ07zGbBM9X3BLzTpGz3e7TxiavkMMQ_sPK0JnB4"}'::jsonb,
      body := concat('{"triggered_at": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);