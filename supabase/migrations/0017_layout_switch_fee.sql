alter table public.bookings
  add column if not exists layout_switch_count integer not null default 0,
  add column if not exists home_screen_switch_count integer not null default 0;

comment on column public.bookings.layout_switch_count is
  'Anzahl der Layout-Wechsel nach der ersten (kostenlosen) Auswahl. Jeder Wechsel kostet 25 EUR Aufpreis.';
comment on column public.bookings.home_screen_switch_count is
  'Anzahl der Startbildschirm-Wechsel nach der ersten (kostenlosen) Auswahl. Jeder Wechsel kostet 25 EUR Aufpreis.';
