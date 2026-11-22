-- VisionBooth: anonyme Nutzungszählung je Event (ohne Kennung, ohne IP, nichts auf dem Gerät gespeichert).
-- offen = Gäste-Seite geöffnet, foto = Foto gemacht, app = als App gespeichert, zurueck = über visionbooth.de zurückgekehrt
create table if not exists public.vb_event_stats (
  id bigserial primary key,
  event_id uuid not null references public.vb_events(id) on delete cascade,
  step text not null check (step in ('offen', 'foto', 'app', 'zurueck')),
  created_at timestamptz not null default now()
);
create index if not exists vb_event_stats_event_idx on public.vb_event_stats (event_id, step);
alter table public.vb_event_stats enable row level security;
