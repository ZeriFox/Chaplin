/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Firebase web configuration is public client metadata. Force the known
  // production project here so stale variables copied into a migrated Vercel
  // project cannot silently point authentication at a different Firebase app.
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyBKK8q78f-DuOtzIqV7EDAnUVsVp05-IHs",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "chaplin-viterbo.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "chaplin-viterbo",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "chaplin-viterbo.firebasestorage.app",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "669780646187",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:669780646187:web:700f8af3dea37ebb058d6e",
  },

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
