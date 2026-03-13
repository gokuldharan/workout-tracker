-- IronLog Workout Tracker Schema
-- Run this in your Supabase SQL Editor

-- Exercises table
create table if not exists exercises (
  id text primary key,
  name text not null,
  category text not null check (category in ('Upper Body', 'Lower Body', 'Core')),
  muscle_group text not null,
  created_at timestamptz default now()
);

-- Workout history table
create table if not exists history (
  id bigint generated always as identity primary key,
  exercise_id text not null references exercises(id) on delete cascade,
  date date not null,
  day text,
  sets jsonb not null default '[]',
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_history_exercise_id on history(exercise_id);
create index if not exists idx_history_date on history(date desc);

-- Enable RLS
alter table exercises enable row level security;
alter table history enable row level security;

-- Public read/write policies (for anon key access - no auth required)
create policy "Public read exercises" on exercises for select using (true);
create policy "Public insert exercises" on exercises for insert with check (true);
create policy "Public read history" on history for select using (true);
create policy "Public insert history" on history for insert with check (true);
create policy "Public delete history" on history for delete using (true);
