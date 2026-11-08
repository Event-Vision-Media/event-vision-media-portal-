import type { VbOccasionId } from "@/components/visionbooth/packages";

/** Feine Linien-Icons (statt Emojis) – erben die Farbe über currentColor. */
const EXTRA = {
  target: ["M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", "M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z", "M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"],
  gift: ["M4 8.5h16v3.5H4Z", "M5.5 12h13v8.5h-13Z", "M12 8.5v12", "M12 8.5C10.5 5 7 4.5 7 6.8 7 8.5 10 8.5 12 8.5Z", "M12 8.5c1.5-3.5 5-4 5-1.7 0 1.7-3 1.7-5 1.7Z"],
  lock: ["M6 11h12v9.5H6Z", "M8.5 11V8a3.5 3.5 0 0 1 7 0v3", "M12 15v2"],
  tv: ["M3 5.5h18v11H3Z", "M8 20h8", "M12 16.5V20"],
  image: ["M4 4h16v16H4Z", "M4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 18", "M16.5 8.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"],
  heart: ["M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"],
  phone: ["M7 3h10v18H7Z", "M11 18h2"],
  camera: ["M3.5 8.5A1.5 1.5 0 0 1 5 7h2.5l1.5-2.5h6L16.5 7H19a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18Z", "M15.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"],
  bulb: ["M9 18h6", "M10 21h4", "M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"],
  tag: ["M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9Z", "M9 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"],
  users: ["M12 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z", "M3.5 19.5c0-3 2.4-5 5.5-5s5.5 2 5.5 5", "M15 5.2a3 3 0 0 1 0 5.6", "M17 14.8c2 .6 3.5 2.3 3.5 4.7"],
  wheel: ["M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z", "M12 3.5v17", "M3.5 12h17", "M6 6l12 12", "M18 6L6 18", "M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z", "M12 1.5l-1.5 2h3Z"],
  trophy: ["M7 4h10v5a5 5 0 0 1-10 0Z", "M7 6H4.5a2.5 2.5 0 0 0 2.6 3.6", "M17 6h2.5a2.5 2.5 0 0 1-2.6 3.6", "M12 14v3.5", "M8.5 20.5h7", "M9.5 17.5h5v3h-5Z"],
  qr: ["M4 4h6v6H4Z", "M14 4h6v6h-6Z", "M4 14h6v6H4Z", "M14 14h2v2h-2Z", "M18 14h2", "M14 18h2v2", "M18 18h2v2h-2Z", "M6.5 6.5h1v1h-1Z", "M16.5 6.5h1v1h-1Z", "M6.5 16.5h1v1h-1Z"],
  link: ["M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1", "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"],
  sparkle: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z", "M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z"],
  download: ["M12 4v11", "M7.5 10.5 12 15l4.5-4.5", "M4.5 19.5h15"],
  bell: ["M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5Z", "M10 20.5a2 2 0 0 0 4 0"],
  magnet: ["M6 4h4v8a2 2 0 0 0 4 0V4h4v8a6 6 0 0 1-12 0Z", "M6 8h4", "M14 8h4"],
} as const;
export type LineIconName = VbOccasionId | keyof typeof EXTRA;

const PATHS: Record<LineIconName, readonly string[]> = {
  ...EXTRA,
  hochzeit: ["M14 14a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z", "M20 14a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z", "M15 3.5l2 2-2 2-2-2Z"],
  kindergeburtstag: ["M17 9c0 3.6-2.2 6.5-5 6.5S7 12.6 7 9s2.2-6 5-6 5 2.4 5 6Z", "M11 15.5h2l-1 1.5Z", "M12 17c-1 1.6 1 3 0 4.5"],
  babyparty: ["M8 9h8v10a2.5 2.5 0 0 1-2.5 2.5h-3A2.5 2.5 0 0 1 8 19Z", "M10 9V7.5a2 2 0 0 1 4 0V9", "M7.5 9h9", "M11 13.5h2", "M11 16.5h2"],
  geburtstag: ["M4 13.5A1.5 1.5 0 0 1 5.5 12h13a1.5 1.5 0 0 1 1.5 1.5V20H4Z", "M4 15.5c2 1.4 2.7-1.4 4 0s2 1.4 4 0 2.7-1.4 4 0 2 1.4 4 0", "M8 12V9.5", "M12 12V9.5", "M16 12V9.5", "M8 5.8c.7.8.7 1.6 0 2.2-.7-.6-.7-1.4 0-2.2Z", "M12 5.8c.7.8.7 1.6 0 2.2-.7-.6-.7-1.4 0-2.2Z", "M16 5.8c.7.8.7 1.6 0 2.2-.7-.6-.7-1.4 0-2.2Z"],
  party: ["M4 20l4.2-11L15 15.8Z", "M13 7.5l1.2-1.2", "M17 11.5l2-.4", "M15.5 3.5l.5 1.6", "M20 5.5l-1.6 1.4", "M21 9.5h-1.6", "M11 4.5c.8.9.4 2-.4 2.6"],
  firma: ["M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17", "M3.5 21h17", "M9 7h2", "M13 7h2", "M9 11h2", "M13 11h2", "M9 15h2", "M13 15h2", "M11 21v-3h2v3"],
  weihnachtsfeier: ["M12 3l5 7h-3l4 6H6l4-6H7Z", "M11 16h2v4h-2Z", "M9.5 20h5"],
  messe: ["M4.5 9l1.5-4h12l1.5 4Z", "M3.5 9h17", "M6 9v4", "M18 9v4", "M5 13h14v7H5Z", "M9.5 16.5h5"],
  sonstiges: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z", "M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z"],
};

export function OccasionIcon({ id, className = "h-6 w-6" }: { id: LineIconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {PATHS[id].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Icon im Glas-Kästchen; aktiv = gold gefüllt. */
export function IconTile({ id, on = false, size = "h-11 w-11" }: { id: LineIconName; on?: boolean; size?: string }) {
  return (
    <span
      className={`flex ${size} flex-none items-center justify-center rounded-xl border`}
      style={
        on
          ? { color: "#141417", background: "linear-gradient(180deg, color-mix(in srgb, var(--a) 70%, white), var(--a))", borderColor: "transparent" }
          : { color: "var(--a)", background: "linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.01))", borderColor: "rgba(255,255,255,.10)" }
      }
    >
      <OccasionIcon id={id} />
    </span>
  );
}
