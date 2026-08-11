-- Erweiterung für Paket-artige Extra-Varianten (z.B. Audiogästebuch-Pakete):
-- Liste enthaltener Leistungen + "Beliebt"-Kennzeichnung.

alter table public.extra_variants
  add column if not exists features text,
  add column if not exists is_popular boolean not null default false;

comment on column public.extra_variants.features is 'Enthaltene Leistungen, eine pro Zeile.';
comment on column public.extra_variants.is_popular is 'Als "Beliebt" hervorheben.';
