-- Nachzahlung: Beim Abhaken des Restbetrags merken wir den damals bezahlten Gesamtbetrag.
-- Bucht der Kunde danach noch etwas dazu, ist die Differenz als Nachzahlung offen –
-- per Überweisung oder bar bei Lieferung/Abholung (wählt der Kunde im Portal).
alter table public.bookings add column if not exists rest_paid_amount numeric;
alter table public.bookings add column if not exists extra_payment_method text check (extra_payment_method in ('ueberweisung', 'bar'));
-- Positionen (Name + Preis) zum Zeitpunkt der Zahlung – damit der Kunde sieht, wofür die Nachzahlung ist
alter table public.bookings add column if not exists rest_paid_lines jsonb;
