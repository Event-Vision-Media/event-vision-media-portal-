"use client";

/** QR-Code als PNG speichern (z. B. für Einladungen, Tischkarten oder eine Präsentation). */
export function VbQrDownload({ svg, name }: { svg: string; name: string }) {
  function download() {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 1200;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 1200, 1200);
      ctx.drawImage(img, 60, 60, 1080, 1080);
      c.toBlob((b) => {
        if (!b) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `${name}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }, "image/png");
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
  return (
    <button type="button" onClick={download} className="rounded-full border border-anthracite-200 bg-white px-4 py-2.5 text-sm font-medium text-anthracite-800 hover:border-gold-400">
      QR-Code als Bild ↓
    </button>
  );
}
