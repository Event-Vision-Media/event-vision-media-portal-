-- VisionBooth-Zusatz: tatsächlicher Preis beim Dazubuchen (z. B. Black-Week-Rabatt).
-- Leer = Listenpreis des Pakets (wie bisher).
alter table public.vb_events add column if not exists addon_price numeric(10,2);
