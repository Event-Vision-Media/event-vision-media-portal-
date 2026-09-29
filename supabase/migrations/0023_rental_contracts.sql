-- Digitaler Mietvertrag im Kundenportal (/dashboard/vertrag).
--
-- Der Vertrag wird aus der Buchung erzeugt (lib/contract.ts: Pakete, Extras,
-- Preise, gerätespezifische Klauseln). Der Kunde ergänzt Adresse, Location,
-- Ansprechpartner und Zeiten und unterschreibt per Finger/Maus. Pro
-- Unterschrift entsteht eine unveränderliche Zeile mit dem vollständigen
-- Vertragstext (Snapshot) – spätere Änderungen an der Vorlage ändern
-- unterschriebene Verträge nicht.
--
-- Rein additiv; bestehende Buchungen sind nicht betroffen.

create table if not exists public.booking_contracts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  template_version text not null,
  -- Vollständiger, gerenderter Vertrag zum Zeitpunkt der Unterschrift
  snapshot jsonb not null,
  snapshot_sha256 text not null,
  -- Angaben des Mieters
  renter_name text not null,
  renter_company text,
  renter_street text not null,
  renter_zip_city text not null,
  location_name text,
  location_street text,
  location_zip_city text,
  onsite_contact_name text,
  onsite_contact_phone text,
  handover_window text,
  return_window text,
  -- Zustimmungen
  location_confirmed boolean not null default false,
  withdrawal_ack boolean not null default false,
  early_start_requested boolean not null default false,
  reference_consent boolean not null default false,
  -- Unterschrift
  signer_name text not null,
  signature_png text not null,
  signed_at timestamptz not null default now(),
  signed_ip text,
  signed_user_agent text,
  -- Gegenzeichnung durch den Vermieter
  countersigned_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.booking_contracts is 'Digital unterschriebene Mietverträge (je Unterschrift eine unveränderliche Zeile).';
comment on column public.booking_contracts.snapshot is 'Gerenderter Vertragstext (Abschnitte, Positionen, Beträge) zum Zeitpunkt der Unterschrift.';
comment on column public.booking_contracts.signature_png is 'Unterschrift als PNG-Data-URL.';

create index if not exists booking_contracts_booking_idx on public.booking_contracts (booking_id, signed_at desc);

alter table public.booking_contracts enable row level security;
-- Keine Policies: Zugriff ausschließlich serverseitig über den Service-Role-Client.
