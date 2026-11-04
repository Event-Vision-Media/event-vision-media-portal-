-- Angebote über das Portal (Weg B): Bei Rückfragen oder Anpassungen schickt der Admin statt der
-- direkten Bestätigung ein Angebot. Der Kunde nimmt es über einen Link an (→ automatische
-- Auftragsbestätigung), wünscht eine Änderung oder lehnt ab. Jede neue Version ersetzt die vorige.
-- Erinnerung nach 3 Tagen, Ablauf nach der Gültigkeit (Termin wird frei).
-- Rein additiv; bestehende Buchungen sind nicht betroffen.

create table if not exists public.booking_offers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  version int not null default 1,
  -- geheimer Link-Schlüssel für die Angebotsseite (kein Login nötig)
  token text not null unique,
  message text not null,
  lines jsonb not null default '[]'::jsonb,
  items jsonb,
  total numeric(10, 2),
  valid_until date not null,
  status text not null default 'offen'
    check (status in ('offen', 'angenommen', 'aenderung', 'abgelehnt', 'abgelaufen', 'ersetzt')),
  customer_note text,
  viewed_at timestamptz,
  responded_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.booking_offers is 'Angebote an Website-Anfragen (annehmen / Änderung / ablehnen über Link).';

create index if not exists booking_offers_booking_idx on public.booking_offers (booking_id, created_at desc);
create index if not exists booking_offers_open_idx on public.booking_offers (status, valid_until);

-- Nur der Server (Service-Role) liest und schreibt – Kunden kommen nur über den Token-Link an ihr Angebot.
alter table public.booking_offers enable row level security;
