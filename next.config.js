/** @type {import('next').NextConfig} */
const supabaseHostname = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).hostname : undefined;
  } catch {
    return undefined;
  }
})();

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
    ],
  },
};

module.exports = nextConfig;
