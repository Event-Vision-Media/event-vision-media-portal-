alter table public.bookings
  add column if not exists event_completed boolean not null default false;

comment on column public.bookings.event_completed is
  'Admin-Kennzeichnung: Veranstaltung ist komplett abgeschlossen (alles erledigt). Dient nur der Übersicht in der Buchungsliste (grüne Markierung).';
