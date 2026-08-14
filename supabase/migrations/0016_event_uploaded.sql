alter table public.bookings
  add column if not exists event_uploaded boolean not null default false;

comment on column public.bookings.event_uploaded is
  'Admin-Kennzeichnung: Kunde hat alle benötigten Infos/Unterlagen geliefert und die Veranstaltung wurde ins System (z. B. externe Planungssoftware) übertragen.';
