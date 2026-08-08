/** @type {import('next').NextConfig} */
const expectedFirebaseProjectId = "chaplin-house"
const expectedFirebaseAuthDomain = `${expectedFirebaseProjectId}.firebaseapp.com`
const requiredPublicFirebaseVariables = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
]

if (process.env.VERCEL) {
  const missingFirebaseVariables = requiredPublicFirebaseVariables.filter((name) => !process.env[name])
  if (missingFirebaseVariables.length > 0) {
    throw new Error(`Configurazione Firebase browser incompleta: mancano ${missingFirebaseVariables.join(", ")}.`)
  }

  if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== expectedFirebaseProjectId) {
    throw new Error(
      `Configurazione Firebase browser non valida: NEXT_PUBLIC_FIREBASE_PROJECT_ID deve essere "${expectedFirebaseProjectId}".`,
    )
  }

  if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN !== expectedFirebaseAuthDomain) {
    throw new Error(
      `Configurazione Firebase browser non valida: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN deve essere "${expectedFirebaseAuthDomain}".`,
    )
  }
}

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
