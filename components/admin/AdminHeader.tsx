"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { adminLogout } from "@/app/actions/admin-auth";

type NavLink = { href: string; label: string; hint?: string };

/** Tägliche Arbeit – immer sichtbar. */
const MAIN: NavLink[] = [
  { href: "/admin/uebersicht", label: "Übersicht" },
  { href: "/admin/kalender", label: "Kalender" },
  { href: "/admin/anfragen", label: "Anfragen" },
  { href: "/admin/dashboard", label: "Buchungen" },
  { href: "/admin/zahlungen", label: "Zahlungen" },
  { href: "/admin/lieferung", label: "Lieferung" },
];

/** Gruppen im Aufklapp-Menü. */
const GROUPS: { label: string; links: NavLink[] }[] = [
  {
    label: "Gestaltung",
    links: [
      { href: "/admin/layout-freigaben", label: "Layout-Freigaben", hint: "Entwürfe an Kunden senden" },
      { href: "/admin/startbildschirm-freigaben", label: "Startbildschirm-Freigaben", hint: "Personalisierte Startbildschirme" },
      { href: "/admin/layouts", label: "Layouts", hint: "Auswahl für Kunden pflegen" },
      { href: "/admin/home-screens", label: "Startbildschirme", hint: "Vorlagen je Gerät" },
      { href: "/admin/extras", label: "Extras", hint: "Event Highlights, Preise, Bilder" },
    ],
  },
  {
    label: "Einstellungen",
    links: [
      { href: "/admin/verfuegbarkeit", label: "Verfügbarkeit", hint: "Tage & Geräte sperren" },
      { href: "/admin/zugangscodes", label: "Zugangscodes", hint: "Portal-Codes der Kunden" },
      { href: "/admin/statistik", label: "Statistik", hint: "Anfragen, Abschlussquote, Upsells, Herkunft" },
      { href: "/admin/mail-vorschau", label: "E-Mails", hint: "Alle automatischen Mails ansehen" },
      { href: "/admin/settings", label: "Allgemein", hint: "Bankverbindung, Kalender-Abo, Google" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin/dashboard") return pathname === href || pathname.startsWith("/admin/bookings");
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminHeader() {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Aufklapp-Menü bei Klick daneben oder Escape schließen
  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !navRef.current?.contains(e.target as Node)) setOpenGroup(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-anthracite-700 bg-anthracite-900 print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/admin/uebersicht" className="flex flex-none items-center gap-2.5">
          <span className="relative h-8 w-8 flex-none">
            <Image src="/logo-mark.png" alt="Event Vision Media" fill sizes="32px" className="object-contain" />
          </span>
          <span className="font-serif text-lg font-semibold text-white">
            Event Vision <span className="hidden text-gold-300 xl:inline">· Admin</span>
          </span>
        </Link>

        <div ref={navRef} className="hidden items-center gap-1 text-sm lg:flex">
          {MAIN.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 transition ${
                isActive(pathname, link.href) ? "bg-anthracite-800 text-white" : "text-anthracite-300 hover:bg-anthracite-800/60 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {GROUPS.map((group) => {
            const active = group.links.some((l) => isActive(pathname, l.href));
            const open = openGroup === group.label;
            return (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenGroup(open ? null : group.label)}
                  aria-expanded={open}
                  className={`flex items-center gap-1 rounded-lg px-3 py-2 transition ${
                    active || open ? "bg-anthracite-800 text-white" : "text-anthracite-300 hover:bg-anthracite-800/60 hover:text-white"
                  }`}
                >
                  {group.label}
                  <svg viewBox="0 0 20 20" className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} fill="currentColor"><path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
                </button>
                {open && (
                  <div className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-xl border border-anthracite-100 bg-white py-1.5 shadow-xl">
                    {group.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpenGroup(null)}
                        className={`block px-4 py-2.5 transition hover:bg-sand-50 ${isActive(pathname, link.href) ? "bg-gold-50" : ""}`}
                      >
                        <span className="block text-sm font-medium text-anthracite-800">{link.label}</span>
                        {link.hint && <span className="block text-xs text-anthracite-400">{link.hint}</span>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <form action={adminLogout} className="ml-2 border-l border-anthracite-700 pl-3">
            <button type="submit" className="text-sm text-anthracite-400 hover:text-white">Abmelden</button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={menuOpen}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-lg text-white transition hover:bg-anthracite-800 lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav className="max-h-[80vh] overflow-y-auto border-t border-anthracite-700 px-4 pb-4 lg:hidden">
          <div className="grid grid-cols-2 gap-2 pt-3">
            {MAIN.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-xl px-3 py-3 text-center text-base ${
                  isActive(pathname, link.href) ? "bg-gold-600 text-white" : "bg-anthracite-800 text-anthracite-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          {GROUPS.map((group) => (
            <div key={group.label} className="mt-4">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-anthracite-500">{group.label}</p>
              <div className="mt-1 divide-y divide-anthracite-800">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-1 py-3 text-base ${isActive(pathname, link.href) ? "text-gold-300" : "text-anthracite-200"}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <form action={adminLogout} className="mt-4 border-t border-anthracite-800 pt-2">
            <button type="submit" className="w-full py-3 text-left text-base text-anthracite-400">Abmelden</button>
          </form>
        </nav>
      )}
    </header>
  );
}
