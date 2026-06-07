create table if not exists public.student_gate_events (
  id uuid primary key default gen_random_uuid(),
  card_token text not null,
  scanned_url text,
  direction text not null default 'entry' check (direction in ('entry', 'exit')),
  student_class text,
  stream text,
  school_type text,
  grade_update_by text,
  school_location text not null default 'School Location',
  scan_point text not null default 'Main gate',
  scanner_name text,
  source text not null default 'school_qr_scan',
  scanned_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

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
  add column if not exists school_type text;

alter table public.student_gate_events
  add column if not exists grade_update_by text;

create index if not exists student_gate_events_class_stream_idx
  on public.student_gate_events (student_class, stream);
