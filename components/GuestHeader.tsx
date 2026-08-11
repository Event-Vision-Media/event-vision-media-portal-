import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

export function GuestHeader({ bookingCode }: { bookingCode: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-anthracite-100/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-3 leading-tight">
          <span className="relative flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-anthracite-900 p-1.5 shadow-sm">
            <Image
              src="/logo-mark.png"
              alt="Event Vision Media"
              fill
              sizes="36px"
              className="object-contain"
            />
          </span>
          <span className="flex flex-col">
            <span className="font-serif text-lg font-semibold text-anthracite-800">
              Event Vision Media
            </span>
            <span className="text-xs tracking-wide text-anthracite-400">
              Code: {bookingCode}
            </span>
          </span>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-anthracite-500 transition hover:bg-anthracite-50 hover:text-anthracite-800"
          >
            Abmelden
          </button>
        </form>
      </div>
    </header>
  );
}
