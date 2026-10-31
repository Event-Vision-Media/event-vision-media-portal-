// Schlanke Linien-Icons für die Gäste-App (statt Emojis in Bedienelementen).
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const IconCamera = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} {...base}>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);
export const IconSparkles = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} {...base}>
    <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
  </svg>
);
export const IconShare = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} {...base}>
    <path d="M12 3v12M8 7l4-4 4 4" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
);
export const IconBack = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} {...base}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const IconFlip = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} {...base}>
    <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
    <path d="M4 4v4h4" />
    <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
    <path d="M20 20v-4h-4" />
  </svg>
);
export const IconRetake = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} {...base}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);
export const IconGallery = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} {...base}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
export const IconCheck = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} {...base}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
