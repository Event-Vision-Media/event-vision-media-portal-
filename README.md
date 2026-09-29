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

## Website-Anfragen (automatische Buchung)

Das Anfrageformular der Website (fotobox-essen.com) sendet an
`POST /api/public/inquiry`. Ablauf:

1. Die App berechnet Pakete, Extras und Gesamtpreis **serverseitig** neu
   (`lib/catalog.ts` – muss mit den Website-Preisen übereinstimmen).
2. Verfügbarkeit der Geräte wird geprüft (`device_stock` + bestehende
   Buchungen inkl. Mehrtages-Buchungen und als Extra gebuchter Geräte).
3. **Termin frei** → Buchung mit `lifecycle = reserviert`, zufälligem
   Zugangscode (`EV-XXXX-XXXX`) und E-Mail „Reservierung + Portal-Zugang“.
   **Termin belegt** → `lifecycle = anfrage`, nur Admin-Benachrichtigung.
4. Im Admin unter **Anfragen** mit einem Klick bestätigen → Auftragsbestätigung
   per E-Mail. Oder ablehnen (optional mit Absage-Mail).

### Einrichtung

1. Migration `supabase/migrations/0020_website_inquiries.sql` im SQL-Editor
   ausführen (**vor** dem Deployment dieses Codes – die Buchungsübersicht filtert
   auf die neue Spalte `lifecycle`).
2. Gerätebestände in Tabelle `device_stock` prüfen (Standard: je 1 Gerät,
   4 Audiogästebücher).
3. Umgebungsvariablen aus `.env.example` (Abschnitt Website-Anfragen) setzen.
   Ohne `RESEND_API_KEY` funktioniert alles, es werden nur keine Mails verschickt.
4. Bei Resend die Domain `fotobox-essen.com` verifizieren (DNS-Einträge).

## Sichere Zugangscodes

Buchungscodes (FB-…) sind fortlaufend und damit erratbar. Seit Migration
`0021_access_codes.sql` hat jede Buchung zusätzlich einen zufälligen
**Zugangscode** (`EV-XXXX-XXXX`, Spalte `access_code`), der automatisch vergeben wird.

Login-Reihenfolge: Zugangscode → individuelles Passwort → (übergangsweise)
FB-Buchungscode. Nach 10 Fehlversuchen je IP ist der Login 15 Minuten gesperrt.

Umstellung:
1. Migration `0021_access_codes.sql` ausführen.
2. Im Admin unter **Zugangscodes** allen Kunden mit anstehenden Events ihren
   neuen Code schicken (Button „Per WhatsApp senden“).
3. `LEGACY_BOOKING_CODE_LOGIN=false` setzen und neu deployen.

## Automatische Kunden-E-Mails & Upsells

- **Upgrade im Kundenportal:** Website-Buchungen sehen im Dashboard das nächsthöhere
  Paket (z. B. Audiogästebuch Basis → Komfort +15 €) und können es mit zwei Klicks
  buchen. Preis wird serverseitig neu berechnet, Admin wird benachrichtigt.
- **Empfehlungen:** „Macht euer Event komplett“ zeigt bis zu 3 verfügbare, noch nicht
  gebuchte Extras (`lib/recommendations.ts`).
- **Täglicher Lauf** `/api/cron/daily` (Vercel Cron, 07:00 UTC, `vercel.json`):
  - Erinnerung ≤ 28 Tage vor dem Event: offene Schritte + 2 passende Extras
  - Nachher-Mail 7 Tage nach dem Event (Galerie freigeschaltet) + Google-Bewertung
  - Jede Mail nur einmal (`reminder_sent_at`, `followup_sent_at`, Migration 0022)
  - Lokal testen: `http://localhost:3000/api/cron/daily?dry=1`
- Vorschau aller Mails: Admin → **E-Mails**.
