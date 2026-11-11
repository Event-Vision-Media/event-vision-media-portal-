-- Ansprache je Buchung: Du/Sie unabhängig vom Kundentyp (leer = automatisch: Business = Sie, privat = Du)
-- und Anrede (Frau/Herr) für „Guten Tag Frau Muster“. Ohne Anrede wird nie ein Geschlecht geraten.
alter table public.bookings add column if not exists address_form text check (address_form in ('du', 'sie'));
alter table public.bookings add column if not exists salutation text check (salutation in ('frau', 'herr'));
