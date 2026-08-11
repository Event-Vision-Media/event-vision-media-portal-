alter table public.bookings
  add column if not exists custom_login_code text;

create unique index if not exists bookings_custom_login_code_key
  on public.bookings (custom_login_code)
  where custom_login_code is not null;

comment on column public.bookings.custom_login_code is
  'Optionales individuelles Passwort für den Kunden-Login, alternativ zum automatisch generierten Buchungscode.';
