-- SMARAN family vault schema (apply in Supabase SQL editor when credentials exist).
-- Row-level security assumes auth.uid() and family_memberships.

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.family_memberships (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'caregiver', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create table if not exists public.care_recipients (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  display_name text not null,
  relationship text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  recipient_id uuid not null references public.care_recipients (id),
  doctor text not null,
  starts_at timestamptz not null,
  local_date date not null,
  local_time time not null,
  timezone text not null default 'Asia/Kolkata',
  status text not null check (status in ('upcoming', 'completed', 'cancelled')),
  created_by uuid references public.profiles (id),
  source_type text,
  source_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  status text not null,
  actor_id uuid references public.profiles (id),
  recorded_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  recipient_id uuid not null references public.care_recipients (id),
  kind text not null check (kind in ('medicine', 'check', 'pickup', 'appointment', 'document_pickup', 'other')),
  title text not null,
  medicine_name text,
  local_time time,
  local_date date,
  timezone text not null default 'Asia/Kolkata',
  recurrence text,
  status text not null default 'active',
  created_by uuid references public.profiles (id),
  confirmation_status text not null default 'unconfirmed',
  created_at timestamptz not null default now()
);

create table if not exists public.reminder_occurrences (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  due_at timestamptz not null,
  status text not null check (status in ('scheduled', 'attempted', 'acknowledged', 'completed', 'snoozed', 'skipped', 'missed', 'failed')),
  actor_id uuid references public.profiles (id),
  recorded_at timestamptz
);

create table if not exists public.health_measurements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  recipient_id uuid not null references public.care_recipients (id),
  kind text not null,
  value text not null,
  unit text,
  recorded_at timestamptz not null,
  author_id uuid references public.profiles (id),
  source_type text not null,
  source_id text,
  confirmation_status text not null default 'family_reported'
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  recipient_id uuid references public.care_recipients (id),
  storage_path text not null,
  extract_status text not null check (extract_status in ('queued', 'processing', 'needs_review', 'confirmed', 'failed')),
  extracted_text text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.families enable row level security;
alter table public.family_memberships enable row level security;
alter table public.care_recipients enable row level security;
alter table public.appointments enable row level security;
alter table public.reminders enable row level security;
alter table public.health_measurements enable row level security;
alter table public.documents enable row level security;

-- Members may only see rows for families they belong to.
create policy families_member_select on public.families
  for select using (exists (
    select 1 from public.family_memberships m
    where m.family_id = families.id and m.user_id = auth.uid()
  ));

create policy memberships_self on public.family_memberships
  for select using (user_id = auth.uid() or exists (
    select 1 from public.family_memberships m
    where m.family_id = family_memberships.family_id and m.user_id = auth.uid()
  ));
