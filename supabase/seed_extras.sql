-- Beispiel "Exclusive Extras" (Platzhalterbilder via placehold.co).
-- Im Admin-Bereich unter /admin/extras später durch echte Inhalte ersetzen.

insert into public.extras (name, category, description, preview_image_url, price, has_variants, is_active, sort_order)
values
  ('Hintergrund', 'Exclusive Extras', 'Wählt euren individuellen Hintergrund für die Fotobox.', 'https://placehold.co/600x400/4f5761/ffffff.png?text=Hintergrund', 0, true, true, 10),
  ('Audiogästebuch', 'Exclusive Extras', 'Eure Gäste hinterlassen euch persönliche Audio-Grüße zum Nachhören.', 'https://placehold.co/600x400/875e29/ffffff.png?text=Audiogaestebuch', 49.00, false, true, 20),
  ('Zusätzliche Requisiten-Box', 'Exclusive Extras', 'Noch mehr lustige Accessoires für eure Fotos.', 'https://placehold.co/600x400/a87731/ffffff.png?text=Requisiten-Box', 19.00, false, true, 30)
on conflict do nothing;

insert into public.extra_variants (extra_id, name, description, preview_image_url, price, is_available, sort_order)
select id, v.name, v.description, v.preview_image_url, v.price, true, v.sort_order
from public.extras, (
  values
    ('Klassisch Weiß', 'Schlichter weißer Hintergrund, passt zu jedem Anlass.', 'https://placehold.co/600x400/faf8f4/4f5761.png?text=Weiss', 0::numeric, 10),
    ('Gold Glitzer', 'Edler goldener Glitzerhintergrund.', 'https://placehold.co/600x400/c4933f/ffffff.png?text=Gold+Glitzer', 15::numeric, 20),
    ('Greenery', 'Grüner Blätter-Hintergrund für Boho/Garten-Feiern.', 'https://placehold.co/600x400/6f4d27/f5edd9.png?text=Greenery', 15::numeric, 30),
    ('Bokeh Lichter', 'Stimmungsvoller Hintergrund mit Lichterbokeh.', 'https://placehold.co/600x400/16181c/d3a95c.png?text=Bokeh', 20::numeric, 40)
) as v(name, description, preview_image_url, price, sort_order)
where extras.name = 'Hintergrund'
on conflict do nothing;
