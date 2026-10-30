-- ==============================================================================
-- StudyFlow: Supabase Cloud Sync Schema
-- Run this in your Supabase Project -> SQL Editor -> Run
-- ==============================================================================

-- Create the cloud sync storage table for encrypted / JSON syllabus data
create table if not exists public.studyflow_sync (
  id text primary key default 'default_user',
  payload jsonb not null,
  synced_at bigint not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.studyflow_sync enable row level security;

-- Create policy allowing the public anon key to read and upsert sync payloads
create policy "Allow anon full access for personal sync"
  on public.studyflow_sync
  for all
  to anon
  using (true)
  with check (true);

-- Optional: Index on synced_at for fast time checks
create index if not exists idx_studyflow_sync_synced_at on public.studyflow_sync (synced_at);
