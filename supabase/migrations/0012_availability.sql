-- Fotobox Essen: datumsabhängige Verfügbarkeit für Event Highlights & Hintergründe
--
-- Lagerbestand ("total_stock") kann auf zwei Ebenen gepflegt werden:
-- - public.extras.total_stock: für einfache Extras (kein Varianten) sowie für
--   Extras mit Varianten, die sich einen gemeinsamen Bestand teilen (z.B.
--   "Audiogästebuch" — 4 Geräte, unabhängig vom gebuchten Paket).
-- - public.extra_variants.total_stock: für Varianten mit eigenem, exklusivem
--   Bestand (z.B. jeder "Hintergrund" ist nur 1x vorhanden).
-- Regel (siehe lib/availability.ts): ist extras.total_stock gesetzt, gilt der
-- Bestand für alle Varianten gemeinsam; ist es NULL, zählt total_stock der
-- jeweiligen Variante. NULL auf beiden Ebenen bedeutet unbegrenzt verfügbar.
--
-- "Gebucht" wird nicht gespeichert, sondern live aus booking_extras (verknüpft
-- über bookings.event_date) berechnet — so bleibt der Bestand bei Entfernen
-- oder Stornieren eines Extras automatisch korrekt.
--
-- Zusätzliche manuelle Blockierungen (z.B. Wartung, externe Vermietung) werden
-- in availability_blocks für einen Datumsbereich hinterlegt und ebenfalls vom
-- verfügbaren Bestand abgezogen.

alter table public.extras add column if not exists total_stock int;
alter table public.extra_variants add column if not exists total_stock int;

create table if not exists public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  extra_id uuid references public.extras (id) on delete cascade,
  variant_id uuid references public.extra_variants (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  blocked_quantity int not null default 1,
  note text,
  created_at timestamptz not null default now(),
  constraint availability_blocks_target check (
    (extra_id is not null and variant_id is null) or
    (extra_id is null and variant_id is not null)
  ),
  constraint availability_blocks_date_range check (end_date >= start_date)
);

comment on table public.availability_blocks is 'Manuell vom Admin hinterlegte Verfügbarkeits-Blockierungen für ein Extra oder eine Extra-Variante über einen Datumsbereich.';

create index if not exists availability_blocks_extra_idx on public.availability_blocks (extra_id);
create index if not exists availability_blocks_variant_idx on public.availability_blocks (variant_id);
create index if not exists availability_blocks_dates_idx on public.availability_blocks (start_date, end_date);

alter table public.availability_blocks enable row level security;

-- Bestände für die vom Kunden genannten Event Highlights (geteilter Bestand
-- auf Extra-Ebene, unabhängig vom gewählten Paket).
update public.extras set total_stock = 4 where name = 'Audiogästebuch';
update public.extras set total_stock = 1 where name = 'XXL-LOVE Leuchtbuchstaben';
update public.extras set total_stock = 1 where name = 'Aufblasbare Fotokabine — 2,5 × 2,5 × 2,5 m';
update public.extras set total_stock = 2 where name = 'Mobiler WLAN-Router';

-- Jeder Hintergrund ist genau 1x vorhanden (Bestand auf Varianten-Ebene, da
-- jede Variante ein eigenständiges physisches Motiv ist).
update public.extra_variants set total_stock = 1
where extra_id = (select id from public.extras where name = 'Hintergrund')
  and name in (
    'Happy Birthday', 'Gold Glitzer', 'Rosa', 'Schwarz / Weiße Ballons', 'Blumen',
    'Schwarz mit Gold-Glitzer', 'Party-Ballons', 'Holz', 'Holz mit Lichterkette',
    'Weiße Blumenwand', 'Lila/Party'
  );
