# Event Vision Media – Kundenportal

Web-App für Event Vision Media: Kunden loggen sich nach ihrer Buchung mit einem
Buchungscode ein, wählen ihr Foto-Layout aus und hinterlegen ihre
Personalisierungswünsche. Im Admin-Bereich verwaltest du Buchungen und
Layouts und exportierst offene Zusatzwünsche als CSV für die Rechnungsstellung.

## Tech-Stack

- Next.js 14 (App Router), TypeScript
- Tailwind CSS
- Supabase (Postgres + Storage + Auth für den Admin-Login)
- Kein Passwort-Login für Gäste – Zugang nur über Buchungscode
- Kein Zahlungsanbieter – Premium-Layouts/Zusatzwünsche werden separat abgerechnet

## 1. Lokal starten

```bash
npm install
```

Erstelle eine `.env.local` auf Basis von `.env.example`:

```bash
cp .env.example .env.local
```

Trage dort deine Supabase-Werte ein (Supabase Dashboard → Project Settings → API):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (⚠️ geheim halten, nur serverseitig verwendet)

Dev-Server starten:

```bash
npm run dev
```

Die App läuft dann unter [http://localhost:3000](http://localhost:3000).

## 2. Supabase einrichten

1. Erstelle ein neues Projekt auf [supabase.com](https://supabase.com).
2. Öffne den SQL-Editor und führe der Reihe nach aus:
   - `supabase/migrations/0001_init.sql` (legt Tabellen, RLS und den
     Storage-Bucket `layout-previews` an)
   - `supabase/seed.sql` (legt 17 Beispiel-Layouts mit Platzhalterbildern an –
     ersetze die Bilder später einfach im Admin-Bereich unter „Layouts“)
3. Lege dein Admin-Konto an: Supabase Dashboard → Authentication → Users →
   „Add user“ (E-Mail + Passwort). Damit meldest du dich unter `/admin` an.
   Eine separate `admin_users`-Tabelle ist nicht nötig – Supabase Auth
   (`auth.users`) übernimmt das bereits vollständig, getrennt vom
   Gäste-Zugang über Buchungscodes.

## 3. Buchungen anlegen

Neue Buchungen legst du im Admin-Bereich unter „+ Neue Buchung“ an
(`/admin/bookings/new`). Der Buchungscode wird automatisch im Format
`FB-<Jahr>-<fortlaufende Nummer>` vergeben (z. B. `FB-2026-0001`). Diesen Code
teilst du deinen Kunden mit (z. B. in der Buchungsbestätigung) – damit loggen
sie sich im Kundenportal unter `/` ein.

## 4. Seiten im Überblick

**Gäste-Bereich**
- `/` – Login mit Buchungscode
- `/dashboard` – Übersicht, Countdown, Fortschritt
- `/dashboard/layout` – Layout-Galerie (inklusive & Premium)
- `/dashboard/personalisierung` – Namen, Datum, Sonderwünsche, Zusatzwünsche

**Admin-Bereich** (geschützt durch Supabase Auth)
- `/admin` – Admin-Login
- `/admin/dashboard` – alle Buchungen, Statusfilter, CSV-Export
- `/admin/bookings/new` – neue Buchung anlegen
- `/admin/layouts` – Layouts verwalten (inkl. Bild-Upload)

## 5. Deployment (Vercel)

1. Repository zu GitHub pushen und in Vercel importieren.
2. Die drei Umgebungsvariablen aus `.env.example` in den Vercel-Projekt-
   Einstellungen hinterlegen.
3. Deployen – fertig.

## Hinweise

- Die Platzhalterbilder der Seed-Layouts kommen von placehold.co und sind
  nur zur Ansicht gedacht. Ersetze sie im Admin-Bereich durch echte
  Vorschaubilder (werden automatisch in den Supabase-Storage-Bucket
  `layout-previews` hochgeladen).
- DSGVO: Auf der Personalisierungs-Seite muss der Gast einer
  Datenschutz-Checkbox zustimmen, bevor Name/Datum gespeichert werden. Es ist
  kein Tracking-Skript eingebaut.
