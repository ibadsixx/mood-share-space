-- Create comment_shares table
create table if not exists comment_shares (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references comments(id) on delete cascade,
  shared_by uuid not null,
  shared_to uuid,
  shared_post_id uuid references posts(id) on delete cascade,
  type text not null check (type in ('copy_link', 'share_to_feed', 'share_via_message')),
  created_at timestamptz default now()
);

-- Enable RLS
alter table comment_shares enable row level security;

-- Policies
create policy "Authenticated users can insert shares"
  on comment_shares
  for insert
  to authenticated
  with check (auth.uid() = shared_by);

create policy "Authenticated users can view shares"
  on comment_shares
  for select
  to authenticated
  using (true);

-- Index for performance
create index idx_comment_shares_comment_id on comment_shares(comment_id);
create index idx_comment_shares_shared_by on comment_shares(shared_by);