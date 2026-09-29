-- Sichere Zugangscodes für den Kunden-Login
--
-- Hintergrund: Buchungscodes sind fortlaufend (FB-2026-0001, -0002, …) und
-- damit leicht zu erraten. Jede Buchung erhält deshalb zusätzlich einen
-- zufälligen Zugangscode im Format "EV-XXXX-XXXX" (40 Bit Zufall aus
-- gen_random_uuid(), Alphabet ohne verwechselbare Zeichen 0/O/1/I).
--
-- Der Login per Buchungscode bleibt übergangsweise aktiv und wird über die
-- Umgebungsvariable LEGACY_BOOKING_CODE_LOGIN=false abgeschaltet, sobald alle
-- bestehenden Kunden ihren neuen Zugangscode erhalten haben.

create or replace function public.generate_access_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 Zeichen
  bytes bytea := uuid_send(gen_random_uuid());
  -- Bytes 6 und 8 enthalten Versions-/Variant-Bits der UUID und werden übersprungen.
  positions int[] := array[0, 1, 2, 3, 4, 5, 9, 10];
  code text := '';
  i int;
begin
  foreach i in array positions loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return 'EV-' || substr(code, 1, 4) || '-' || substr(code, 5, 4);
end;
$$;

alter table public.bookings
  add column if not exists access_code text;

-- Bestehende Buchungen: vorhandene EV-Codes aus Website-Anfragen übernehmen,
-- alle anderen erhalten einen neuen Zufallscode.
update public.bookings
  set access_code = custom_login_code
  where access_code is null and custom_login_code ~ '^EV-[A-Z0-9]{4}-[A-Z0-9]{4}$';

update public.bookings
  set access_code = public.generate_access_code()
  where access_code is null;

alter table public.bookings
  alter column access_code set default public.generate_access_code(),
  alter column access_code set not null;

create unique index if not exists bookings_access_code_key on public.bookings (access_code);

comment on column public.bookings.access_code is
  'Zufälliger, nicht erratbarer Zugangscode für den Kunden-Login (EV-XXXX-XXXX).';
