-- Run this in the Supabase SQL Editor to create the AI conversations table

create table if not exists ai_conversations (
  id bigint generated always as identity primary key,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  context_summary text,  -- condensed workout context at time of message
  created_at timestamptz default now()
);

create index if not exists idx_ai_conversations_created on ai_conversations(created_at desc);

alter table ai_conversations enable row level security;
create policy "Public read ai_conversations" on ai_conversations for select using (true);
create policy "Public insert ai_conversations" on ai_conversations for insert with check (true);
create policy "Public delete ai_conversations" on ai_conversations for delete using (true);
