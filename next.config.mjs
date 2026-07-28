/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    // Re-enabled optimization: serves resized/compressed images instead of
    // full-resolution originals. Loading the full-res /chaplin/*.JPG camera
    // photos caused the browser to run Out of Memory and crash the tab.
    formats: ["image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400,
  },
  output: "standalone",
  reactStrictMode: true,

  // ⬇️ Aggiunto: header solo per le pagine auth
  async headers() {
    return [
      // Login
      {
        source: "/login",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
      // Register
      {
        source: "/register",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
      // (Opzionale) Admin login
      {
        source: "/admin-login",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;

