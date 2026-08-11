-- Fotobox Essen: Online-Galerie
-- Admin hinterlegt manuell den Link zur Online-Galerie je Buchung. Kunden
-- sehen den Bereich im Kundenbereich erst ab ca. 7 Tage nach dem Event-Datum
-- (siehe GALLERY_UNLOCK_DAYS in lib/types.ts). Beim Klick auf den Link wird
-- der Zeitpunkt des letzten Aufrufs gespeichert (app/api/gallery-redirect).

alter table public.bookings
  add column if not exists online_gallery_url text,
  add column if not exists online_gallery_clicked_at timestamptz;

comment on column public.bookings.online_gallery_url is 'Manuell vom Admin hinterlegter Link zur Online-Galerie des Kunden.';
comment on column public.bookings.online_gallery_clicked_at is 'Zeitpunkt, an dem der Kunde zuletzt auf den Online-Galerie-Link geklickt hat.';
