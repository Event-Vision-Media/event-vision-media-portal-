-- Gästebuch-Spiel: Wählscheibe mit Aufgaben fürs Audiogästebuch, erreichbar per QR-Code (/gb/<token>).
-- Inklusive in Audiogästebuch Komfort/Premium, für Basis als Extra „Gästebuch-Spiel“ (10 €) nachbuchbar.
create table if not exists public.guestbook_games (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  token text not null unique,
  occasion text not null default 'party' check (occasion in ('hochzeit', 'geburtstag', 'firma', 'party')),
  names text,
  custom_tasks jsonb not null default '[]'::jsonb,
  -- Vom Admin ohne Aufpreis freigeschaltet (z. B. Kulanz oder Altbuchung)
  admin_enabled boolean not null default false,
  spins integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.guestbook_games enable row level security;

-- Extra für Basis-Kunden (im Portal unter „Event Highlights“ buchbar)
insert into public.extras (name, category, description, price, has_variants, is_active, sort_order)
select 'Gästebuch-Spiel', 'Exclusive Extras',
  'Eure Gäste scannen einen QR-Code und drehen an einer Telefon-Wählscheibe – und bekommen eine witzige Aufgabe fürs Audiogästebuch. Passend zu eurem Anlass, mit euren Namen und auf Wunsch mit eigenen Aufgaben. Die Druckvorlage mit QR-Code bekommt ihr im Portal.',
  10, false, true, 45
where not exists (select 1 from public.extras where name = 'Gästebuch-Spiel');
