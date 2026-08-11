-- Fotobox Essen: Beispielbilder je Produkt für die "Personalisierter
-- Startbildschirm"-Zusatzoption. Wird auf der Kunden-Startbildschirm-Seite
-- passend zum gebuchten Produkt angezeigt (z.B. Fotobox- vs.
-- Fotospiegel-Kontext), admin-verwaltet unter /admin/home-screens.

create table if not exists public.personalized_screen_examples (
  id uuid primary key default gen_random_uuid(),
  product_type text not null unique,
  example_image_url text not null,
  updated_at timestamptz not null default now()
);

comment on table public.personalized_screen_examples is 'Produktabhängiges Beispielbild für die Zusatzoption "Personalisierter Startbildschirm".';

alter table public.personalized_screen_examples enable row level security;
