"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { adminLogout } from "@/app/actions/admin-auth";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Buchungen" },
  { href: "/admin/layouts", label: "Layouts" },
  { href: "/admin/home-screens", label: "Startbildschirme" },
  { href: "/admin/extras", label: "Extras" },
  { href: "/admin/verfuegbarkeit", label: "Verfügbarkeit" },
  { href: "/admin/lieferung", label: "Lieferung" },
  { href: "/admin/layout-freigaben", label: "Layout-Freigabe" },
  { href: "/admin/startbildschirm-freigaben", label: "Startbildschirm-Freigabe" },
  { href: "/admin/settings", label: "Einstellungen" },
];

export function AdminHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-anthracite-700 bg-anthracite-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <span className="flex items-center gap-2.5">
          <span className="relative h-8 w-8 flex-none">
            <Image
              src="/logo-mark.png"
              alt="Event Vision Media"
              fill
              sizes="32px"
              className="object-contain"
            />
          </span>
          <span className="font-serif text-lg font-semibold text-white">
            Event Vision Media · Admin
          </span>
        </span>

        <nav className="hidden items-center gap-4 text-sm text-anthracite-300 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>

        <form action={adminLogout} className="hidden lg:block">
          <button type="submit" className="text-sm text-anthracite-300 hover:text-white">
            Abmelden
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={menuOpen}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-lg text-white transition hover:bg-anthracite-800 lg:hidden"
        >
          {menuOpen ? (
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-anthracite-700 px-4 py-2 lg:hidden">
          <div className="flex flex-col divide-y divide-anthracite-800">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-3.5 text-base text-anthracite-200 active:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <form action={adminLogout} className="border-t border-anthracite-800 pt-2">
            <button
              type="submit"
              className="w-full py-3.5 text-left text-base text-anthracite-200 active:text-white"
            >
              Abmelden
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
