-- Besucher-Trichter: anonyme Zählung, wie weit Website-Besucher kommen
-- (Einstieg → Termin geprüft → Anfrageformular → Schritte → abgeschickt).
-- Keine Cookies, keine IP, keine personenbezogenen Daten – nur Schritt, Kanal und Seite.
-- Rein additiv; bestehende Daten sind nicht betroffen.

create table if not exists public.funnel_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  step text not null,
  channel text not null,
  campaign text,
  page text
);

comment on table public.funnel_events is 'Anonyme Trichter-Zählung der Website (ohne Cookies/IP) für die Statistik im Admin.';

create index if not exists funnel_events_created_idx on public.funnel_events (created_at desc);

alter table public.funnel_events enable row level security;
