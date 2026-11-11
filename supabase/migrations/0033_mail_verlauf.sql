-- Mail-Verlauf: jede vom Portal verschickte Mail (Betreff, Inhalt, Empfänger) mit Zustellstatus von Resend.
-- Im Admin bei der Buchung sichtbar: „Was wurde dem Kunden wann geschickt – und ist es angekommen?“
create table if not exists public.mail_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  booking_id uuid references public.bookings (id) on delete set null,
  recipient text not null,
  subject text not null,
  html text,
  -- gesendet | fehler | test (Test-Adresse, nicht verschickt) | aus (kein Mail-Dienst konfiguriert)
  status text not null default 'gesendet',
  resend_id text,
  -- Letzter Stand bei Resend: sent, delivered, delivery_delayed, bounced, complained, opened, clicked
  last_event text,
  checked_at timestamptz
);
create index if not exists mail_log_recipient_idx on public.mail_log (lower(recipient), created_at desc);
create index if not exists mail_log_booking_idx on public.mail_log (booking_id, created_at desc);
alter table public.mail_log enable row level security;
-- Keine Policies: nur der Server (Service-Role) liest und schreibt.
