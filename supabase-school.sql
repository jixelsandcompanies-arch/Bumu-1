create table if not exists public.student_gate_events (
  id uuid primary key default gen_random_uuid(),
  card_token text not null,
  scanned_url text,
  direction text not null default 'entry' check (direction in ('entry', 'exit')),
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
