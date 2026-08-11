import Image from "next/image";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-anthracite-100 bg-white/60">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
        <span className="relative flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-anthracite-900 p-1.5 shadow-sm">
          <Image
            src="/logo-mark.png"
            alt="Event Vision Media"
            fill
            sizes="36px"
            className="object-contain"
          />
        </span>
        <p className="font-serif text-base font-semibold text-anthracite-800">
          Event Vision Media
        </p>
        <p className="max-w-sm text-sm text-anthracite-500">
          Unvergessliche Erinnerungen für euer Event – mit Herz und Liebe zum Detail.
        </p>
        <p className="text-xs text-anthracite-400">
          © {new Date().getFullYear()} Event Vision Media
        </p>
      </div>
    </footer>
  );
}
