-- Fotobox Essen: "Exclusive Extras" (Event Highlights)
-- Zusatzoptionen mit echten Preisen, admin-verwaltet. Manche Extras (z.B.
-- "Hintergrund") haben mehrere auswählbare Varianten mit eigenem
-- Vorschaubild/Preis/Beschreibung; einfache Extras (z.B. "Audiogästebuch")
-- werden direkt aktiviert/deaktiviert.

create table if not exists public.extras (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Exclusive Extras',
  description text,
  preview_image_url text,
  price numeric(10, 2) not null default 0,
  has_variants boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.extras is 'Zusatzoptionen ("Exclusive Extras") zur Auswahl durch Kunden im Bereich Event Highlights.';

create table if not exists public.extra_variants (
  id uuid primary key default gen_random_uuid(),
  extra_id uuid not null references public.extras (id) on delete cascade,
  name text not null,
  description text,
  preview_image_url text,
  price numeric(10, 2) not null default 0,
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.extra_variants is 'Auswählbare Varianten eines Extras, z.B. einzelne Hintergründe.';

create index if not exists extra_variants_extra_id_idx on public.extra_variants (extra_id);

-- Zuordnung: welche Extras (ggf. mit Variante) hat eine Buchung gewählt.
create table if not exists public.booking_extras (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  extra_id uuid not null references public.extras (id) on delete cascade,
  variant_id uuid references public.extra_variants (id) on delete set null,
  price numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (booking_id, extra_id)
);

comment on table public.booking_extras is 'Von Kunden ausgewählte Exclusive Extras je Buchung, Preis zum Auswahlzeitpunkt gespeichert.';

alter table public.extras enable row level security;
alter table public.extra_variants enable row level security;
alter table public.booking_extras enable row level security;

insert into storage.buckets (id, name, public)
values ('extra-previews', 'extra-previews', true)
on conflict (id) do nothing;

drop policy if exists "Extra-Vorschaubilder oeffentlich lesbar" on storage.objects;
create policy "Extra-Vorschaubilder oeffentlich lesbar"
  on storage.objects for select
  using (bucket_id = 'extra-previews');
