-- Create mentions table for tracking @username mentions in posts and comments
create table if not exists public.mentions (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('post', 'comment')),
  source_id uuid not null,
  mentioned_user_id uuid not null references profiles(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.mentions enable row level security;

-- RLS Policies
create policy "Authenticated users can insert mentions"
  on public.mentions
  for insert 
  to authenticated
  with check (auth.uid() = created_by);

create policy "Authenticated users can view mentions"
  on public.mentions
  for select 
  to authenticated
  using (true);

create policy "Users can delete their own mentions"
  on public.mentions
  for delete 
  to authenticated
  using (auth.uid() = created_by);

-- Indexes for better performance
create index if not exists mentions_source_type_id_idx on public.mentions(source_type, source_id);
create index if not exists mentions_mentioned_user_idx on public.mentions(mentioned_user_id);
create index if not exists mentions_created_by_idx on public.mentions(created_by);