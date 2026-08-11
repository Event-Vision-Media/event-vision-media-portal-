-- Zeitstempel, wann der Kunde seine Exclusive-Extras-Auswahl verbindlich
-- "gebucht" (bestätigt) hat. Null = noch nicht bestätigt. Wird bei jeder
-- Änderung der Auswahl zurückgesetzt, damit der Status immer die aktuell
-- ausgewählten Extras widerspiegelt.

alter table public.bookings
  add column if not exists extras_confirmed_at timestamptz;

comment on column public.bookings.extras_confirmed_at is 'Zeitpunkt, an dem der Kunde seine Exclusive-Extras-Auswahl verbindlich bestätigt hat.';
