import Image from "next/image";
import Link from "next/link";
import { adminLogout } from "@/app/actions/admin-auth";

export function AdminHeader() {
  return (
    <header className="border-b border-anthracite-700 bg-anthracite-900">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-6">
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
          <nav className="flex gap-4 text-sm text-anthracite-300">
            <Link href="/admin/dashboard" className="hover:text-white">
              Buchungen
            </Link>
            <Link href="/admin/layouts" className="hover:text-white">
              Layouts
            </Link>
            <Link href="/admin/home-screens" className="hover:text-white">
              Startbildschirme
            </Link>
            <Link href="/admin/extras" className="hover:text-white">
              Extras
            </Link>
            <Link href="/admin/verfuegbarkeit" className="hover:text-white">
              Verfügbarkeit
            </Link>
            <Link href="/admin/lieferung" className="hover:text-white">
              Lieferung
            </Link>
            <Link href="/admin/layout-freigaben" className="hover:text-white">
              Layout-Freigabe
            </Link>
            <Link href="/admin/startbildschirm-freigaben" className="hover:text-white">
              Startbildschirm-Freigabe
            </Link>
            <Link href="/admin/settings" className="hover:text-white">
              Einstellungen
            </Link>
          </nav>
        </div>
        <form action={adminLogout}>
          <button type="submit" className="text-sm text-anthracite-300 hover:text-white">
            Abmelden
          </button>
        </form>
      </div>
    </header>
  );
}
