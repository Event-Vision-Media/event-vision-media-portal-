-- Website-Anfragen: Buchungen entstehen automatisch aus dem Anfrageformular
-- der Website (fotobox-essen.com) und durchlaufen einen Lebenszyklus:
--
--   anfrage     -> Gerät am Wunschtermin nicht frei; nur Admin sieht sie,
--                  Kunde hat noch keinen Portal-Zugang
--   reserviert  -> Termin frei, Kunde hat Portal-Zugang erhalten, Admin
--                  muss mit einem Klick bestätigen
--   bestaetigt  -> Auftragsbestätigung verschickt (Standard für alle
--                  bisherigen, im Admin angelegten Buchungen)
--   abgelehnt / storniert
--
-- Rein additive Migration: bestehende Buchungen erhalten lifecycle =
-- 'bestaetigt' und source = 'admin' und verhalten sich unverändert.

alter table public.bookings
  add column if not exists lifecycle text not null default 'bestaetigt',
  add column if not exists source text not null default 'admin',
  add column if not exists customer_type text,
  add column if not exists customer_name text,
  add column if not exists company text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists occasion text,
  add column if not exists location text,
  add column if not exists guest_count int,
  add column if not exists event_days int not null default 1,
  add column if not exists inquiry_items jsonb,
  add column if not exists total_price numeric(10, 2),
  add column if not exists inquiry_message text,
  add column if not exists layout_draft jsonb,
  add column if not exists confirmed_at timestamptz,
  add column if not exists declined_at timestamptz;

alter table public.bookings drop constraint if exists bookings_lifecycle_check;
alter table public.bookings
  add constraint bookings_lifecycle_check
  check (lifecycle in ('anfrage', 'reserviert', 'bestaetigt', 'abgelehnt', 'storniert'));

comment on column public.bookings.lifecycle is 'Buchungs-Lebenszyklus: anfrage | reserviert | bestaetigt | abgelehnt | storniert.';
comment on column public.bookings.source is 'Herkunft der Buchung: admin (manuell) oder website (Anfrageformular).';
comment on column public.bookings.inquiry_items is 'Serverseitig berechnete Pakete & Extras zum Anfragezeitpunkt: {packages:[...], extras:[...], days, total}.';

create index if not exists bookings_lifecycle_idx on public.bookings (lifecycle);
create index if not exists bookings_created_at_idx on public.bookings (created_at);

-- ---------------------------------------------------------------------------
-- Bestand der Hauptgeräte (für die automatische Verfügbarkeitsprüfung).
-- device_key entspricht lib/catalog.ts. Bestände im Supabase-Dashboard
-- (Table Editor) anpassen, falls z. B. ein zweiter Spiegel dazukommt.
-- ---------------------------------------------------------------------------
create table if not exists public.device_stock (
  device_key text primary key,
  label text not null,
  total int not null default 1 check (total >= 0)
);

comment on table public.device_stock is 'Anzahl physisch vorhandener Hauptgeräte je Gerätetyp für die Verfügbarkeitsprüfung von Website-Anfragen.';

insert into public.device_stock (device_key, label, total) values
  ('spiegel', 'Fotospiegel (Magic Mirror) – Modern & Gold teilen sich die Geräte', 2),
  ('fotobox', 'Fotobox', 2),
  ('360', '360° Video Booth', 1),
  ('audio', 'Audiogästebuch', 4),
  ('love', 'LOVE XXL Buchstaben', 1)
on conflict (device_key) do nothing;

alter table public.device_stock enable row level security;
