import Image from "next/image";

// Markenzeichen wie auf fotobox-essen.com: Gold-Schwung mit „EV“ – ohne schwarze Kachel.
// tone „light“ = auf hellem Grund (Gold abgedunkelt für Kontrast), „dark“ = auf dunklem Grund (leuchtendes Gold).

const GOLD_TEXT = {
  light: "linear-gradient(180deg, #d3a95c 0%, #a87731 100%)",
  dark: "linear-gradient(180deg, #f0d595 0%, #d3a95c 50%, #b8873d 100%)",
};

export function BrandMark({ size = 44, tone = "light", priority = false }: { size?: number; tone?: "light" | "dark"; priority?: boolean }) {
  const h = Math.round(size * 1.09);
  return (
    <span className="group/brand relative inline-grid flex-none place-items-center" style={{ width: size, height: h }} aria-hidden>
      <Image
        src="/logo-mark.png"
        alt=""
        fill
        sizes={`${size}px`}
        priority={priority}
        className="object-contain transition-transform duration-500 group-hover/brand:-rotate-12"
        style={{
          filter:
            tone === "light"
              ? "saturate(2.2) brightness(.62) contrast(1.25) drop-shadow(0 0 .5px #a87731) drop-shadow(0 0 .5px #a87731)"
              : "brightness(1.1) saturate(1.4) drop-shadow(0 0 .6px #f0d595) drop-shadow(0 0 3px rgba(240,213,149,.4))",
        }}
      />
      <b
        className="relative font-serif font-semibold tracking-wide"
        style={{ marginLeft: size * 0.13, fontSize: Math.round(size * 0.35), lineHeight: 1, background: GOLD_TEXT[tone], WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
      >
        EV
      </b>
    </span>
  );
}

/** „Event Vision Media“ mit goldenem „Media“. */
export function BrandName({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <>
      Event Vision{" "}
      <span style={{ background: GOLD_TEXT[tone], WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Media</span>
    </>
  );
}
