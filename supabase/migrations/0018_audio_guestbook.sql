-- Audiogästebuch: Begrüßungsnachricht des Kunden (eine je Buchung) und die
-- nach der Veranstaltung vom Admin hochgeladenen Gästeaufnahmen (viele je
-- Buchung).
--
-- Anders als bei layout-proofs/personalized-screen-* sind die Storage-Buckets
-- hier NICHT öffentlich lesbar: Audiodateien sind persönliche Sprachnach-
-- richten und dürfen laut Vorgabe nie über eine erratbare URL erreichbar
-- sein. Zugriff ausschließlich über kurzlebige, serverseitig (Service-Role)
-- erzeugte signierte URLs.

create table if not exists public.audio_guestbook_greetings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size bigint not null,
  mime_type text not null,
  uploaded_at timestamptz not null default now()
);

comment on table public.audio_guestbook_greetings is
  'Vom Kunden hochgeladene Begrüßungsnachricht fürs Audiogästebuch (eine je Buchung, wird bei Austausch überschrieben).';

alter table public.audio_guestbook_greetings enable row level security;

create table if not exists public.audio_guestbook_recordings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size bigint not null,
  mime_type text not null,
  uploaded_at timestamptz not null default now()
);

comment on table public.audio_guestbook_recordings is
  'Nach der Veranstaltung vom Admin hochgeladene Gästeaufnahmen des Audiogästebuchs, je Buchung.';

create index if not exists audio_guestbook_recordings_booking_id_idx
  on public.audio_guestbook_recordings (booking_id);

alter table public.audio_guestbook_recordings enable row level security;

-- Private Buckets (public = false), keine Policies für anon/authenticated:
-- nur der Service-Role-Client kann darauf zugreifen bzw. signierte URLs
-- ausstellen.
insert into storage.buckets (id, name, public)
values
  ('audio-guestbook-greetings', 'audio-guestbook-greetings', false),
  ('audio-guestbook-recordings', 'audio-guestbook-recordings', false)
on conflict (id) do nothing;
