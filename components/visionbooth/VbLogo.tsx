/* eslint-disable @next/next/no-img-element */

// VisionBooth-Logo als SVG (public/visionbooth/logo). „kopfzeile“ = Symbol + Schriftzug in einer Zeile,
// „logo“ = großes Logo mit „Digitale Fotobox“, „symbol“ = nur die Kamera.
const SRC = {
  kopfzeile: { dark: "/visionbooth/logo/visionbooth-kopfzeile.svg", light: "/visionbooth/logo/visionbooth-kopfzeile-hell.svg", w: 420, h: 100 },
  logo: { dark: "/visionbooth/logo/visionbooth-logo.svg", light: "/visionbooth/logo/visionbooth-logo-hell.svg", w: 1000, h: 440 },
  symbol: { dark: "/visionbooth/logo/visionbooth-symbol.svg", light: "/visionbooth/logo/visionbooth-symbol.svg", w: 512, h: 512 },
} as const;

export function VbLogo({ variant = "kopfzeile", light = false, height, className = "", style }: { variant?: keyof typeof SRC; light?: boolean; height: number | string; className?: string; style?: React.CSSProperties }) {
  const s = SRC[variant];
  return <img src={light ? s.light : s.dark} alt="VisionBooth" width={s.w} height={s.h} className={className} style={{ height, width: "auto", ...style }} />;
}
