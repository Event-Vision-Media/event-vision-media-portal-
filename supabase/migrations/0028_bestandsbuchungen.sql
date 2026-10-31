-- Bestandsbuchungen übernehmen: Buchungen, die schon vor dem Portal fest vereinbart waren.
-- contract_on_file: Mietvertrag liegt bereits vor (Papier/PDF) – kein digitaler Vertrag, keine Vertrags-Erinnerung.
-- portal_invite_pending: im Admin still bestätigt, Zugangs-Mail noch nicht verschickt –
--   bis dahin bekommt der Kunde keine automatischen Mails.
-- Rein additiv; bestehende Buchungen sind nicht betroffen (beide Felder false).

alter table public.bookings add column if not exists contract_on_file boolean not null default false;
alter table public.bookings add column if not exists portal_invite_pending boolean not null default false;

comment on column public.bookings.contract_on_file is 'Mietvertrag liegt außerhalb des Portals vor (Bestandsbuchung).';
comment on column public.bookings.portal_invite_pending is 'Bestätigt ohne Mail – Portal-Zugang noch nicht verschickt.';
