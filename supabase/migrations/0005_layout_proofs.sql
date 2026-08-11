-- Layout-Freigabeprozess: Admin lädt individuell erstellte Layout-Entwürfe je
-- Buchung hoch, Kunde prüft sie, gibt frei oder fordert Änderungen an.
-- Getrennt von "layouts" (dem Vorlagen-Katalog zur Layout-Auswahl).

create table if not exists public.layout_proofs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  layout_name text not null,
  version int not null default 1,
  file_url text not null,
  file_type text not null default 'image' check (file_type in ('image', 'pdf')),
  admin_notes text,
  status text not null default 'in_pruefung'
    check (status in ('in_pruefung', 'freigegeben', 'aenderungen_erforderlich')),
  customer_feedback text,
  customer_feedback_at timestamptz,
  admin_response text,
  admin_response_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.layout_proofs is 'Individuelle Layout-Entwürfe je Buchung zur Kundenfreigabe (Versionsverlauf).';

create index if not exists layout_proofs_booking_id_idx on public.layout_proofs (booking_id);
create index if not exists layout_proofs_booking_name_idx on public.layout_proofs (booking_id, layout_name);

alter table public.layout_proofs enable row level security;

insert into storage.buckets (id, name, public)
values ('layout-proofs', 'layout-proofs', true)
on conflict (id) do nothing;

drop policy if exists "Layout-Freigabe-Dateien oeffentlich lesbar" on storage.objects;
create policy "Layout-Freigabe-Dateien oeffentlich lesbar"
  on storage.objects for select
  using (bucket_id = 'layout-proofs');
