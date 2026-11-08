/**
 * Blickfang im Kopf von „Dein Bereich“: goldenes Handy auf dem Ständer mit Fotokarten –
 * als Vektorgrafik (scharf auf jedem Display, keine Ladezeit).
 */
export function VbHeroArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 240" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="vbh-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7e2ad" />
          <stop offset=".45" stopColor="#d4a64e" />
          <stop offset="1" stopColor="#8a6424" />
        </linearGradient>
        <linearGradient id="vbh-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6f501c" />
          <stop offset=".5" stopColor="#e9c77c" />
          <stop offset="1" stopColor="#7a5a22" />
        </linearGradient>
        <linearGradient id="vbh-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d1c1f" />
          <stop offset="1" stopColor="#0b0b0d" />
        </linearGradient>
        <radialGradient id="vbh-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#e7b95a" stopOpacity=".45" />
          <stop offset="1" stopColor="#e7b95a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vbh-photo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a3227" />
          <stop offset="1" stopColor="#15130f" />
        </linearGradient>
      </defs>
      <ellipse cx="150" cy="120" rx="110" ry="100" fill="url(#vbh-glow)" />
      {/* Fotokarten im Hintergrund */}
      <g transform="rotate(-14 70 110)">
        <rect x="28" y="70" width="78" height="86" rx="4" fill="#f3ead8" opacity=".92" />
        <rect x="34" y="76" width="66" height="58" rx="2" fill="url(#vbh-photo)" />
        <path d="M34 124l18-16 14 12 10-8 24 18v4H34Z" fill="#c9a24f" opacity=".55" />
      </g>
      <g transform="rotate(-4 92 128)">
        <rect x="52" y="92" width="74" height="82" rx="4" fill="#fbf4e6" />
        <rect x="58" y="98" width="62" height="55" rx="2" fill="url(#vbh-photo)" />
        <circle cx="104" cy="111" r="6" fill="#e2bd6c" opacity=".8" />
        <path d="M58 145l16-14 12 10 9-7 25 17H58Z" fill="#d6ad5a" opacity=".7" />
      </g>
      {/* Ständer */}
      <path d="M118 206h96l10 16H108Z" fill="url(#vbh-edge)" />
      <rect x="108" y="220" width="116" height="6" rx="3" fill="#5c431a" />
      {/* Handy */}
      <g transform="rotate(10 168 118)">
        <rect x="124" y="28" width="92" height="178" rx="18" fill="url(#vbh-gold)" />
        <rect x="128" y="32" width="84" height="170" rx="15" fill="url(#vbh-screen)" />
        <rect x="156" y="38" width="28" height="6" rx="3" fill="#000" opacity=".8" />
        {/* Sucher-Ecken */}
        <g stroke="#e3bb66" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M142 70v-10h10" />
          <path d="M198 70v-10h-10" />
          <path d="M142 128v10h10" />
          <path d="M198 128v10h-10" />
        </g>
        {/* Gäste-Symbol */}
        <g fill="#e3bb66">
          <circle cx="158" cy="90" r="7" />
          <circle cx="182" cy="90" r="7" />
          <circle cx="170" cy="86" r="8" />
          <path d="M146 116c1-10 7-15 13-15s9 3 11 6c2-3 5-6 11-6s12 5 13 15Z" />
        </g>
        {/* Auslöser */}
        <circle cx="170" cy="168" r="13" fill="none" stroke="#e3bb66" strokeWidth="2.5" />
        <circle cx="170" cy="168" r="9" fill="#f1d595" />
      </g>
      {/* Glanzstrahlen */}
      <g stroke="#e9c77c" strokeWidth="3" strokeLinecap="round" opacity=".9">
        <path d="M200 14l6-10" />
        <path d="M216 22l10-6" />
        <path d="M188 10l-1-10" />
      </g>
    </svg>
  );
}
