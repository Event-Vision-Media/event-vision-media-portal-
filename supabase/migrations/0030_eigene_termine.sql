-- Eigene Termine: Sachen außerhalb der normalen Buchungen (z. B. nur Zubehör vermietet,
-- Wartung, Besorgungen). Erscheinen im Admin-Kalender, im Kalender-Abo und im Wochenplan.
-- Optional mit Rückgabe-/Endtermin und einer Sperre für ein Extra (availability_blocks),
-- damit es auf der Website für den Zeitraum nicht doppelt gebucht wird.
-- Rein additiv; bestehende Tabellen bleiben unverändert.

create table if not exists public.admin_appointments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  time text,
  return_date date,
  return_time text,
  note text,
  block_id uuid references public.availability_blocks (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint admin_appointments_return check (return_date is null or return_date >= date)
);

comment on table public.admin_appointments is 'Eigene Termine des Admins außerhalb der Buchungen (Kalender, Wochenplan).';

create index if not exists admin_appointments_date_idx on public.admin_appointments (date);
create index if not exists admin_appointments_return_idx on public.admin_appointments (return_date);

-- Nur der Server (Service-Role) liest und schreibt – keine Policies für Kunden.
alter table public.admin_appointments enable row level security;
