-- Besucher-Trichter: Zusatzangabe je Ereignis (anonym), z. B.
--   termin_frei / termin_belegt / termin_kurz / formular_belegt → Gerät (spiegel, fotobox, 360, audio, love)
--   formular → Seite, von der das Formular geöffnet wurde (z. B. fotospiegel-mieten.html)
alter table public.funnel_events add column if not exists detail text;
