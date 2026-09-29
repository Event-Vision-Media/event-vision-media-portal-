-- Automatische Kunden-E-Mails (täglicher Cron /api/cron/daily):
--   reminder_sent_at  – Erinnerung ca. 4 Wochen vor dem Event (offene Schritte + passende Extras)
--   followup_sent_at  – Nach dem Event: Online-Galerie ist da + Bitte um Google-Bewertung
-- Rein additiv; verhindert doppelten Versand.

alter table public.bookings
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists followup_sent_at timestamptz;

comment on column public.bookings.reminder_sent_at is 'Zeitpunkt der automatischen Erinnerungs-E-Mail vor dem Event.';
comment on column public.bookings.followup_sent_at is 'Zeitpunkt der automatischen Nachher-E-Mail (Galerie + Bewertung).';
