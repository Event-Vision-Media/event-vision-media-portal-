-- Fotobox Essen: Startbildschirm-Auswahl
-- Kunden wählen (gefiltert nach ihrem gebuchten Produkt) einen von mehreren
-- vorgefertigten Startbildschirmen. Optional können sie zusätzlich einen
-- individuell personalisierten Startbildschirm als kostenpflichtiges Extra
-- buchen (läuft über das bestehende extras/booking_extras-System).

create table if not exists public.home_screens (
  id uuid primary key default gen_random_uuid(),
  product_type text not null,
  name text not null,
  preview_image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.home_screens is 'Vorgefertigte Startbildschirme zur Auswahl durch Kunden, gefiltert nach Produkt (z.B. Fotobox, Fotospiegel).';

create index if not exists home_screens_product_type_idx on public.home_screens (product_type);

alter table public.bookings
  add column if not exists selected_home_screen_id uuid references public.home_screens (id) on delete set null;

alter table public.home_screens enable row level security;

insert into storage.buckets (id, name, public)
values ('home-screen-previews', 'home-screen-previews', true)
on conflict (id) do nothing;

drop policy if exists "Startbildschirm-Vorschaubilder oeffentlich lesbar" on storage.objects;
create policy "Startbildschirm-Vorschaubilder oeffentlich lesbar"
  on storage.objects for select
  using (bucket_id = 'home-screen-previews');

-- Personalisierter Startbildschirm als kostenpflichtiges Extra (eigene
-- Kategorie, damit es sich vom allgemeinen "Exclusive Extras"-Katalog
-- unterscheidet und im Kundenbereich auf der Startbildschirm-Seite statt in
-- den Event Highlights angezeigt wird). Preis/Beschreibung/Bild können danach
-- wie jedes andere Extra unter /admin/extras gepflegt werden.
--
-- Falls bereits ein Extra mit diesem Namen existiert (z.B. bereits manuell im
-- Admin-Bereich angelegt), wird stattdessen dessen Kategorie umgestellt,
-- statt einen Duplikat-Eintrag zu erzeugen.
do $$
begin
  if exists (select 1 from public.extras where name = 'Personalisierter Startbildschirm') then
    update public.extras
    set category = 'Startbildschirm'
    where name = 'Personalisierter Startbildschirm';
  else
    insert into public.extras (name, category, description, preview_image_url, price, has_variants, is_active, sort_order)
    values (
      'Personalisierter Startbildschirm',
      'Startbildschirm',
      'Wir gestalten euch einen individuellen Startbildschirm passend zu eurem Event.',
      null,
      39.00,
      false,
      true,
      0
    );
  end if;
end $$;
