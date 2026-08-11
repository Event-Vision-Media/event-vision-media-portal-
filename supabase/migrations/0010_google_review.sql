-- Fotobox Essen: Google-Bewertung
-- Generische Key-Value-Tabelle für globale, admin-verwaltete Einstellungen
-- (aktuell: Google-Bewertungslink, gilt für alle Buchungen gleichermaßen).
-- Klick-Tracking läuft je Buchung über bookings.google_review_clicked_at,
-- analog zu online_gallery_clicked_at (siehe 0007_online_gallery.sql).

create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is 'Globale, admin-verwaltete Einstellungen als Key-Value-Paare.';

alter table public.app_settings enable row level security;

alter table public.bookings
  add column if not exists google_review_clicked_at timestamptz;

comment on column public.bookings.google_review_clicked_at is 'Zeitpunkt, an dem der Kunde zuletzt auf den Google-Bewertungslink geklickt hat.';
