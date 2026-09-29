/** @type {import('next').NextConfig} */
const supabaseHostname = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).hostname : undefined;
  } catch {
    return undefined;
  }
})();

// Optional weitere Bild-Hosts (kommagetrennt), z. B. lokal zum Testen mit
// Bildern aus dem Live-Speicher. In Produktion normalerweise leer.
const extraImageHosts = (process.env.EXTRA_IMAGE_HOSTS || "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const nextConfig = {
  experimental: {
    serverActions: {
      // Standardlimit für Server-Action-Anfragen (1 MB) reicht nicht für
      // Foto-Uploads von Handykameras (Personalisierung, Admin-Uploads).
      bodySizeLimit: "15mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      ...(supabaseHostname
        ? [{ protocol: "https", hostname: supabaseHostname }]
        : []),
      ...extraImageHosts.map((hostname) => ({ protocol: "https", hostname })),
    ],
  },
};

module.exports = nextConfig;
