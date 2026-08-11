-- Fotobox Essen: Liefer-/Abholverwaltung + Admin-Aktivitäts-Feed
--
-- 1) Liefer- und Abholdaten je Buchung: vom Admin gepflegt (Datum, Uhrzeit,
--    optionales Zeitfenster, Ansprechpartner), im Kundenbereich sichtbar.
--    Zugangshinweise ("Besonderheiten zur Lieferung") kann der Kunde selbst
--    eintragen/bearbeiten, der Admin kann sie ebenfalls bearbeiten.
--
-- 2) activity_log: leichtgewichtiges Ereignisprotokoll für den Admin, damit
--    sichtbar ist, wenn ein Kunde etwas getan hat (Layout gewählt, Extras
--    bestätigt, Freigabe/Änderungswunsch etc.) — Ersatz für E-Mail-Benachrichtigung.

alter table public.bookings
  add column if not exists delivery_date date,
  add column if not exists delivery_time time,
  add column if not exists delivery_time_window text,
  add column if not exists delivery_contact_name text,
  add column if not exists delivery_contact_phone text,
  add column if not exists pickup_date date,
  add column if not exists pickup_time time,
  add column if not exists pickup_time_window text,
  add column if not exists pickup_contact_name text,
  add column if not exists pickup_contact_phone text,
  add column if not exists access_notes text,
  add column if not exists access_notes_updated_at timestamptz;

comment on column public.bookings.access_notes is 'Vom Kunden (oder Admin) hinterlegte Zugangshinweise für die Lieferung, z.B. Treppen, Etage, Zufahrt.';

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  event_type text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

comment on table public.activity_log is 'Ereignisprotokoll für den Admin: zeigt an, wenn ein Kunde eine relevante Aktion durchgeführt hat.';

create index if not exists activity_log_booking_id_idx on public.activity_log (booking_id);
create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);
create index if not exists activity_log_unread_idx on public.activity_log (read_at) where read_at is null;

alter table public.activity_log enable row level security;
