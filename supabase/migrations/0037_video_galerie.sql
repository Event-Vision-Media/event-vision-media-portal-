-- Eigene Online-Galerie (zuerst für 360°-Videos): je Buchung eine Galerie mit teilbarem Link (/g/<token>).
-- 30 Tage nach Veröffentlichung verfügbar, im Kundenportal verlängerbar (+30 / +60 Tage), danach automatisch gelöscht.
create table if not exists public.event_galleries (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  token text not null unique,
  title text,
  published_at timestamptz,
  expires_at timestamptz,
  -- Verlängerung im Kundenportal (wird mit dem Restbetrag bzw. als Nachzahlung abgerechnet)
  extension_days integer not null default 0,
  extension_price numeric not null default 0,
  views integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.event_galleries enable row level security;

create table if not exists public.event_gallery_items (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.event_galleries(id) on delete cascade,
  file_path text not null,
  thumb_path text,
  file_name text,
  size_bytes bigint,
  duration_sec numeric,
  sort integer not null default 0,
  downloads integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists event_gallery_items_gallery_idx on public.event_gallery_items (gallery_id, sort);
alter table public.event_gallery_items enable row level security;

-- Privater Speicher für Videos und Vorschaubilder (Zugriff nur über signierte Links)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-galleries', 'event-galleries', false, 524288000, array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg'])
on conflict (id) do nothing;
