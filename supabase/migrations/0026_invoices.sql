-- Rechnungen im Kundenportal: Der Admin lädt das PDF aus Lexware Office hoch, der Kunde
-- bekommt es per E-Mail (Anhang) und findet es dauerhaft im Portal unter „Zahlung“.
-- Erstellt werden Rechnungen weiterhin in Lexware; hier wird nur abgelegt und verschickt.
-- Rein additiv; bestehende Buchungen sind nicht betroffen.

create table if not exists public.booking_invoices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind text not null check (kind in ('anzahlung', 'rest', 'gesamt', 'sonstige')),
  invoice_number text,
  amount numeric(10, 2),
  file_path text not null,
  file_name text not null,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.booking_invoices is 'Rechnungs-PDFs (aus Lexware) je Buchung – sichtbar im Kundenportal, Versand per E-Mail.';

create index if not exists booking_invoices_booking_idx on public.booking_invoices (booking_id, created_at desc);

-- Nur der Server (Service-Role) liest und schreibt.
alter table public.booking_invoices enable row level security;

-- Privater Speicher für die PDFs (Download nur über das Portal mit kurzlebigem Link).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoices', 'invoices', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;
