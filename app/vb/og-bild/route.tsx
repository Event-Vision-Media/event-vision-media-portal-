import { ImageResponse } from "next/og";

const size = { width: 1200, height: 630 };

/** Vorschaubild für WhatsApp, Facebook, LinkedIn & Co. (visionbooth.de) */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px 80px",
          backgroundColor: "#0b0b0d",
          backgroundImage: "radial-gradient(circle at 80% 15%, rgba(201,160,78,0.45), rgba(11,11,13,0) 55%)",
          color: "#ffffff",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, color: "#dcb56a", fontFamily: "Arial, sans-serif", fontWeight: 700 }}>VISIONBOOTH</div>
        <div style={{ display: "flex", marginTop: 26, fontSize: 76, lineHeight: 1.05, fontWeight: 600, maxWidth: 900 }}>Die digitale Fotobox fürs Handy</div>
        <div style={{ display: "flex", marginTop: 26, fontSize: 32, color: "rgba(255,255,255,0.75)", fontFamily: "Arial, sans-serif", maxWidth: 900 }}>
          QR-Code scannen, Foto mit eurem Rahmen, KI-Bilder & gemeinsame Galerie – ganz ohne App.
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 28, color: "#f0d595", fontFamily: "Arial, sans-serif", fontWeight: 700 }}>Hochzeit · Geburtstag · Firmenfeier · ab 79 €</div>
      </div>
    ),
    size
  );
}
