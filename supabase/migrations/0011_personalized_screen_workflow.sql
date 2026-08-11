-- Fotobox Essen: Workflow für den personalisierten Startbildschirm
-- 1) Kunde hinterlegt Angaben (Name, Datum, Wunschtext, optionales Foto).
-- 2) Admin gestaltet den Startbildschirm offline und lädt einen Entwurf hoch.
-- 3) Kunde prüft den Entwurf und gibt ihn frei oder fordert Änderungen an
--    (Versionierung + Status analog zum bestehenden layout_proofs-Workflow).

create table if not exists public.personalized_screen_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  personalization_name text,
  personalization_date date,
  wish_text text,
  photo_url text,
  updated_at timestamptz not null default now()
);

comment on table public.personalized_screen_requests is 'Vom Kunden hinterlegte Angaben (Name, Datum, Wunschtext, Foto) für den personalisierten Startbildschirm.';

alter table public.personalized_screen_requests enable row level security;

create table if not exists public.personalized_screen_proofs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  version int not null default 1,
  file_url text not null,
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

comment on table public.personalized_screen_proofs is 'Vom Admin hochgeladene Entwürfe des personalisierten Startbildschirms zur Freigabe durch den Kunden.';

create index if not exists personalized_screen_proofs_booking_id_idx on public.personalized_screen_proofs (booking_id);

alter table public.personalized_screen_proofs enable row level security;

insert into storage.buckets (id, name, public)
values
  ('personalized-screen-uploads', 'personalized-screen-uploads', true),
  ('personalized-screen-proofs', 'personalized-screen-proofs', true)
on conflict (id) do nothing;

drop policy if exists "Personalisierungs-Uploads oeffentlich lesbar" on storage.objects;
create policy "Personalisierungs-Uploads oeffentlich lesbar"
  on storage.objects for select
  using (bucket_id = 'personalized-screen-uploads');

drop policy if exists "Startbildschirm-Entwuerfe oeffentlich lesbar" on storage.objects;
create policy "Startbildschirm-Entwuerfe oeffentlich lesbar"
  on storage.objects for select
  using (bucket_id = 'personalized-screen-proofs');
