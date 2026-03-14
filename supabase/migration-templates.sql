-- Run this in the Supabase SQL Editor to create the day_templates table

create table if not exists day_templates (
  id smallint primary key,
  name text not null,
  exercises jsonb not null default '[]',
  updated_at timestamptz default now()
);

alter table day_templates enable row level security;
create policy "Public read day_templates" on day_templates for select using (true);
create policy "Public insert day_templates" on day_templates for insert with check (true);
create policy "Public update day_templates" on day_templates for update using (true);
