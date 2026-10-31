-- VisionBooth: digitale Fotobox im Browser. Gäste scannen einen QR-Code, machen ein
-- Selfie mit Event-Rahmen (optional KI-Stil) und laden es herunter; Fotos landen in
-- Galerie und Live-Wall des Events. Rein additiv; bestehende Buchungen sind nicht betroffen.

create table if not exists public.vb_events (
  id uuid primary key default gen_random_uuid(),
  -- Kurzer Code in der Gäste-URL (/vb/<slug>), nicht erratbar
  slug text not null unique,
  title text not null,
  event_date date,
  -- optional: gehört zu einer Fotobox-/Spiegel-Buchung (Add-on)
  booking_id uuid references public.bookings (id) on delete set null,
  contact_name text,
  contact_email text,
  package text not null default 'privat' check (package in ('privat', 'business', 'addon')),
  status text not null default 'aktiv' check (status in ('entwurf', 'aktiv', 'beendet')),
  -- Gäste-Link funktioniert in diesem Zeitraum (null = unbegrenzt)
  opens_at timestamptz,
  closes_at timestamptz,
  -- Branding
  frame_text text,
  frame_style text not null default 'gold' check (frame_style in ('gold', 'weiss', 'schwarz', 'ohne')),
  -- Bildformate, zwischen denen Gäste wählen können (einzel = Einzelfoto, streifen = Fotostreifen mit 3 Fotos)
  formats text[] not null default '{einzel,streifen}',
  accent_color text not null default '#c4933f',
  logo_path text,
  -- KI-Stile
  ai_enabled boolean not null default false,
  ai_styles text[] not null default '{}',
  ai_limit integer not null default 0,
  ai_per_guest integer not null default 3,
  -- Galerie / Live-Wall
  wall_enabled boolean not null default true,
  gallery_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.vb_events is 'VisionBooth-Events (digitale Fotobox per QR-Code).';

create table if not exists public.vb_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.vb_events (id) on delete cascade,
  kind text not null default 'foto' check (kind in ('foto', 'ki')),
  style text,
  source_photo_id uuid references public.vb_photos (id) on delete set null,
  file_path text not null,
  width integer,
  height integer,
  -- anonyme Geräte-Kennung (zufällig im Browser erzeugt) für das KI-Limit pro Gast
  guest_key text,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists vb_photos_event_idx on public.vb_photos (event_id, created_at desc);

create table if not exists public.vb_ai_jobs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.vb_events (id) on delete cascade,
  -- Original liegt nur beim Gast (ohne Zustimmung wird nichts gespeichert) – daher optional
  photo_id uuid references public.vb_photos (id) on delete cascade,
  style text not null,
  guest_key text,
  status text not null default 'wartet' check (status in ('wartet', 'laeuft', 'fertig', 'fehler')),
  result_photo_id uuid references public.vb_photos (id) on delete set null,
  -- fal.ai-Warteschlange (Anfrage läuft dort, wir fragen den Status ab)
  fal_status_url text,
  fal_response_url text,
  result_url text,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists vb_ai_jobs_event_idx on public.vb_ai_jobs (event_id, created_at desc);

-- Nur der Server (Service-Role) liest und schreibt.
alter table public.vb_events enable row level security;
alter table public.vb_photos enable row level security;
alter table public.vb_ai_jobs enable row level security;

-- Privater Speicher; Anzeige nur über kurzlebige Links aus dem Portal.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visionbooth', 'visionbooth', false, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Testevent für die Entwicklung (nur im Testprojekt sinnvoll; Slug ist öffentlich bekannt)
-- insert into public.vb_events (slug, title, frame_text) values ('demo', 'Demo-Event', 'Anna & Max · 2026');
