-- Zahlungen: 20 % Anzahlung per Überweisung, Restbetrag nach Wahl des Kunden
-- (Überweisung bis 7 Tage vorher oder bar bei Lieferung/Übergabe).
-- Rechnungen selbst werden weiterhin in Lexware Office erstellt; hier wird nur
-- festgehalten, was vereinbart und was eingegangen ist.
-- Rein additiv; bestehende Buchungen sind nicht betroffen.

alter table public.bookings
  add column if not exists rest_payment_method text,
  add column if not exists deposit_amount numeric(10, 2),
  add column if not exists deposit_paid_at timestamptz,
  add column if not exists rest_paid_at timestamptz,
  add column if not exists deposit_reminder_sent_at timestamptz,
  add column if not exists rest_reminder_sent_at timestamptz;

alter table public.bookings drop constraint if exists bookings_rest_payment_method_check;
alter table public.bookings
  add constraint bookings_rest_payment_method_check
  check (rest_payment_method is null or rest_payment_method in ('ueberweisung', 'bar'));

alter table public.booking_contracts
  add column if not exists rest_payment_method text;

comment on column public.bookings.rest_payment_method is 'Restzahlung: ueberweisung (bis 7 Tage vorher) oder bar (bei Lieferung/Übergabe).';
comment on column public.bookings.deposit_amount is 'Vereinbarte Anzahlung (20 %) laut unterschriebenem Mietvertrag.';
comment on column public.bookings.deposit_paid_at is 'Anzahlung eingegangen (vom Admin abgehakt).';
comment on column public.bookings.rest_paid_at is 'Restbetrag eingegangen bzw. bar erhalten (vom Admin abgehakt).';
