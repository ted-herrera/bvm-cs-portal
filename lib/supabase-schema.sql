-- BVM Design Center — Supabase schema
-- Run this in the Supabase SQL Editor to create all tables.

create table if not exists clients (
  id text primary key,
  business_name text not null default '',
  contact_name text not null default '',
  contact_email text not null default '',
  phone text not null default '',
  city text not null default '',
  zip text not null default '',
  assigned_rep text not null default '',
  stage text not null default 'intake',
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  qa_passed_at timestamptz,
  delivered_at timestamptz,
  published_url text,
  sbr_data jsonb,
  selected_look text,
  intake_answers jsonb,
  tear_sheet_url text,
  build_notes jsonb not null default '[]'::jsonb,
  qa_report jsonb,
  messages jsonb not null default '[]'::jsonb,
  internal_notes jsonb not null default '[]'::jsonb,
  build_log jsonb not null default '[]'::jsonb,
  assigned_dev text,
  has_logo boolean not null default false,
  logo_url text,
  interests jsonb,
  confetti_fired boolean not null default false
);

create table if not exists builds (
  id text primary key,
  client_id text not null references clients(id),
  business_name text not null default '',
  city text not null default '',
  zip text not null default '',
  services jsonb not null default '[]'::jsonb,
  look text not null default '',
  tagline text not null default '',
  cta text not null default '',
  sbr_data jsonb,
  generated_site_html text not null default '',
  status text not null default 'unassigned',
  assigned_dev text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  ready_at timestamptz,
  live_at timestamptz,
  live_url text,
  qa_report jsonb
);

create table if not exists messages (
  id text primary key,
  build_id text not null,
  sender_role text not null default 'rep',
  content text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists pulse_timers (
  client_id text primary key references clients(id),
  day7_at bigint not null,
  day14_at bigint not null,
  day30_at bigint not null,
  last_sent_at bigint,
  last_score bigint
);

create table if not exists notifications (
  id text primary key,
  type text not null,
  client_id text not null,
  business_name text not null default '',
  message text not null default '',
  created_at timestamptz not null default now(),
  read boolean not null default false,
  dismissed boolean not null default false,
  meta jsonb
);

-- Enable RLS but allow all for now (anon key)
alter table clients enable row level security;
alter table builds enable row level security;
alter table messages enable row level security;
alter table pulse_timers enable row level security;
alter table notifications enable row level security;

create policy "Allow all on clients" on clients for all using (true) with check (true);
create policy "Allow all on builds" on builds for all using (true) with check (true);
create policy "Allow all on messages" on messages for all using (true) with check (true);
create policy "Allow all on pulse_timers" on pulse_timers for all using (true) with check (true);
create policy "Allow all on notifications" on notifications for all using (true) with check (true);
