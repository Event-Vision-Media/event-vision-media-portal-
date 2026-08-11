-- Fotobox Essen: vom Admin bei Buchungsanlage vorausgewählte Extras
-- Kennzeichnet booking_extras-Zeilen, die der Admin direkt bei Anlage der
-- Buchung als "bereits gebucht" markiert hat (z.B. telefonisch vereinbart).
-- Diese Extras werden im Kundenbereich als bereits gebucht angezeigt und
-- können vom Kunden nicht selbst entfernt werden.

alter table public.booking_extras
  add column if not exists added_by_admin boolean not null default false;

comment on column public.booking_extras.added_by_admin is 'true = vom Admin bei Buchungsanlage vorausgewählt, nicht vom Kunden selbst entfernbar.';
