-- TemplatesBooth-Widget: Kunden personalisieren ein Premium-Design bei TemplatesBooth
-- und schicken es ab. TemplatesBooth meldet jede Einsendung per Webhook an das Portal
-- (/api/webhooks/templatesbooth); sie wird hier gespeichert und – wenn möglich –
-- automatisch der Buchung zugeordnet (Buchungscode im Text, sonst E-Mail + Eventdatum).
-- Rein additiv; bestehende Buchungen sind nicht betroffen.

create table if not exists public.template_submissions (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  booking_id uuid references public.bookings (id) on delete set null,
  matched_by text,
  customer_name text,
  email text,
  event_date date,
  design_name text,
  preview_url text,
  last_event text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.template_submissions is 'Einsendungen aus dem TemplatesBooth-Widget (Webhook), optional einer Buchung zugeordnet.';
comment on column public.template_submissions.matched_by is 'Wie zugeordnet: code, email, admin – leer = noch nicht zugeordnet.';

create index if not exists template_submissions_booking_idx on public.template_submissions (booking_id);
create index if not exists template_submissions_unmatched_idx on public.template_submissions (received_at desc) where booking_id is null;

-- Nur der Server (Service-Role) liest und schreibt.
alter table public.template_submissions enable row level security;

-- Platzhalter-Layout: Buchungen mit TemplatesBooth-Design zeigen darauf. So greifen
-- Premium-Aufpreis, Vertrag, Dashboard und Export ohne Sonderwege. Taucht nicht in der
-- Layout-Galerie auf (wird dort per Name ausgefiltert).
insert into public.layouts (name, preview_image_url, is_premium, extra_price, sort_order, category)
values ('Individuelles Premium-Design', '/layouts/individuelles-design.png', true, 25, 100000, null)
on conflict (name) do nothing;
