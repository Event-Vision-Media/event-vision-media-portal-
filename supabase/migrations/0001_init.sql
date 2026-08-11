-- Fotobox Essen: initiales Datenbankschema
-- Ausführen im Supabase SQL-Editor oder via `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tabelle: layouts
-- ---------------------------------------------------------------------------
create table if not exists public.layouts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  preview_image_url text not null,
  is_premium boolean not null default false,
  extra_price numeric(10, 2) not null default 0,
  sort_order int not null default 0,
  category text,
  created_at timestamptz not null default now()
);

comment on table public.layouts is 'Foto-Layouts zur Auswahl durch Kunden.';
comment on column public.layouts.category is 'Optionale Event-Kategorie, primär für Premium-Layouts (z.B. Hochzeit, Geburtstag).';

-- ---------------------------------------------------------------------------
-- Tabelle: bookings
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  couple_names text not null,
  event_date date not null,
  product_type text not null,
  selected_layout_id uuid references public.layouts (id) on delete set null,
  is_premium_selected boolean not null default false,
  extra_wishes text,
  personalization_name text,
  personalization_date date,
  addon_notes text,
  status text not null default 'offen'
    check (status in ('offen', 'layout_ausgewaehlt', 'personalisierung_komplett')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.bookings is 'Kundenbuchungen, Zugriff ausschließlich über Buchungscode.';

create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_event_date_idx on public.bookings (event_date);

-- updated_at automatisch pflegen
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Es gibt bewusst KEINE Policies für anon/authenticated: Gäste-Zugriff läuft
-- ausschließlich über den Buchungscode-Login (Server Actions mit dem
-- Service-Role-Key), der die App-seitig Berechtigung prüft. Der
-- Service-Role-Key umgeht RLS grundsätzlich, egal ob Policies existieren.
alter table public.layouts enable row level security;
alter table public.bookings enable row level security;

-- ---------------------------------------------------------------------------
-- Storage: Bucket für Layout-Vorschaubilder
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('layout-previews', 'layout-previews', true)
on conflict (id) do nothing;

-- Öffentliches Lesen der Vorschaubilder erlauben (Bucket ist public = true,
-- zusätzlich explizite Policy für SELECT über die REST/Storage-API).
drop policy if exists "Layout-Vorschaubilder oeffentlich lesbar" on storage.objects;
create policy "Layout-Vorschaubilder oeffentlich lesbar"
  on storage.objects for select
  using (bucket_id = 'layout-previews');
