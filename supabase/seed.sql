-- Beispiel-Layouts (Platzhalterbilder via placehold.co).
-- Bilder später einfach über den Admin-Bereich durch echte Vorschaubilder
-- ersetzen (Upload landet automatisch im Supabase-Storage-Bucket
-- "layout-previews").

insert into public.layouts (name, preview_image_url, is_premium, extra_price, sort_order)
values
  -- Inklusive Layouts
  ('Klassisch Elegant', 'https://placehold.co/600x400/f3ede1/6f4d27.png?text=Klassisch+Elegant', false, 0, 10),
  ('Zeitloses Weiß', 'https://placehold.co/600x400/faf8f4/4f5761.png?text=Zeitloses+Weiss', false, 0, 20),
  ('Rustikal Natur', 'https://placehold.co/600x400/e8ddc7/3a4048.png?text=Rustikal+Natur', false, 0, 30),
  ('Boho Chic', 'https://placehold.co/600x400/dac8a4/2b3037.png?text=Boho+Chic', false, 0, 40),
  ('Minimalistisch Modern', 'https://placehold.co/600x400/e4e6e8/1f2227.png?text=Minimalistisch+Modern', false, 0, 50),
  ('Vintage Charme', 'https://placehold.co/600x400/ebdab3/6f4d27.png?text=Vintage+Charme', false, 0, 60),
  ('Gartenhochzeit', 'https://placehold.co/600x400/f5edd9/875e29.png?text=Gartenhochzeit', false, 0, 70),
  ('Schlicht & Schön', 'https://placehold.co/600x400/f4f5f6/2b3037.png?text=Schlicht+%26+Schoen', false, 0, 80),
  ('Filmstreifen Klassik', 'https://placehold.co/600x400/c7cbd0/16181c.png?text=Filmstreifen+Klassik', false, 0, 90),
  ('Sommerliebe', 'https://placehold.co/600x400/f3ede1/a87731.png?text=Sommerliebe', false, 0, 100),

  -- Premium Layouts (+25 EUR)
  ('Gold Elegance', 'https://placehold.co/600x400/a87731/ffffff.png?text=Gold+Elegance', true, 25.00, 110),
  ('Roségold Traum', 'https://placehold.co/600x400/c4933f/ffffff.png?text=Rosegold+Traum', true, 25.00, 120),
  ('Schwarz-Gold Luxus', 'https://placehold.co/600x400/16181c/d3a95c.png?text=Schwarz-Gold+Luxus', true, 25.00, 130),
  ('Marmor & Gold', 'https://placehold.co/600x400/e4e6e8/a87731.png?text=Marmor+%26+Gold', true, 25.00, 140),
  ('Aquarell Blüten', 'https://placehold.co/600x400/dfc186/5d4123.png?text=Aquarell+Bluten', true, 25.00, 150),
  ('Foliendruck Deluxe', 'https://placehold.co/600x400/6f4d27/f5edd9.png?text=Foliendruck+Deluxe', true, 25.00, 160),
  ('Individuelles Wappen-Design', 'https://placehold.co/600x400/875e29/ffffff.png?text=Wappen-Design', true, 25.00, 170)
on conflict (name) do nothing;
