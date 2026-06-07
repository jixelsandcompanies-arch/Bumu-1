create table if not exists public.student_gate_events (
  id uuid primary key default gen_random_uuid(),
  card_token text not null,
  card_type text not null default 'student',
  scanned_url text,
  direction text not null default 'entry' check (direction in ('entry', 'exit')),
  student_class text,
  stream text,
  school_type text,
  grade_update_by text,
  school_location text not null default 'School Location',
  scan_point text not null default 'Main gate',
  scanner_name text,
  scanner_phone text,
  expected_scan_time text,
  grace_minutes integer not null default 30,
  punctuality_status text,
  late_minutes integer not null default 0,
  latitude double precision,
  longitude double precision,
  gps_accuracy_m double precision,
  gps_captured_at timestamptz,
  source text not null default 'school_qr_scan',
  scanned_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.student_gate_events enable row level security;

create index if not exists student_gate_events_card_token_idx
  on public.student_gate_events (card_token);

create index if not exists student_gate_events_scanned_at_idx
  on public.student_gate_events (scanned_at desc);

create index if not exists student_gate_events_location_idx
  on public.student_gate_events (school_location, scan_point);

alter table public.student_gate_events
  add column if not exists student_class text;

alter table public.student_gate_events
  add column if not exists stream text;

alter table public.student_gate_events
  add column if not exists card_type text not null default 'student';

alter table public.student_gate_events
  add column if not exists school_type text;

alter table public.student_gate_events
  add column if not exists grade_update_by text;

alter table public.student_gate_events
  add column if not exists scanner_name text;

alter table public.student_gate_events
  add column if not exists scanner_phone text;

alter table public.student_gate_events
  add column if not exists expected_scan_time text;

alter table public.student_gate_events
  add column if not exists grace_minutes integer not null default 30;

alter table public.student_gate_events
  add column if not exists punctuality_status text;

alter table public.student_gate_events
  add column if not exists late_minutes integer not null default 0;

alter table public.student_gate_events
  add column if not exists latitude double precision;

alter table public.student_gate_events
  add column if not exists longitude double precision;

alter table public.student_gate_events
  add column if not exists gps_accuracy_m double precision;

alter table public.student_gate_events
  add column if not exists gps_captured_at timestamptz;

create index if not exists student_gate_events_class_stream_idx
  on public.student_gate_events (student_class, stream);

create index if not exists student_gate_events_gps_idx
  on public.student_gate_events (latitude, longitude);

create index if not exists student_gate_events_card_type_direction_idx
  on public.student_gate_events (card_type, direction, scanned_at desc);

create index if not exists student_gate_events_punctuality_idx
  on public.student_gate_events (punctuality_status, scanned_at desc);

alter table public.student_gate_events
  drop constraint if exists student_gate_events_card_type_check;

alter table public.student_gate_events
  add constraint student_gate_events_card_type_check
  check (card_type in ('student', 'organization'));

alter table public.student_gate_events
  drop constraint if exists student_gate_events_school_type_check;

alter table public.student_gate_events
  add constraint student_gate_events_school_type_check
  check (school_type is null or school_type in ('boarding', 'day'));

alter table public.student_gate_events
  drop constraint if exists student_gate_events_grade_update_by_check;

alter table public.student_gate_events
  add constraint student_gate_events_grade_update_by_check
  check (grade_update_by is null or grade_update_by in ('class_teacher', 'parent'));

alter table public.student_gate_events
  drop constraint if exists student_gate_events_punctuality_status_check;

alter table public.student_gate_events
  add constraint student_gate_events_punctuality_status_check
  check (punctuality_status is null or punctuality_status in ('on_time', 'late', 'overtime', 'early_leave', 'unscheduled', ''));

alter table public.student_gate_events
  drop constraint if exists student_gate_events_token_length_check;

alter table public.student_gate_events
  add constraint student_gate_events_token_length_check
  check (length(card_token) between 1 and 180);
