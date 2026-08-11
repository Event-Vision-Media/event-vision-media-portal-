alter table public.bookings
  add column if not exists premium_layout_included boolean not null default false;

comment on column public.bookings.premium_layout_included is
  'Wenn true, ist ein Premium-Layout bereits im Buchungspreis enthalten - der Kunde bekommt beim Wählen eines Premium-Layouts keinen zusätzlichen Aufpreis angezeigt/berechnet.';
