/** @type {import('next').NextConfig} */
// The service worker is built by scripts/build-sw.js after `next build`,
// not by next-pwa. next-pwa (last released 2022) generated a worker that
// threw on install and went straight to "redundant", so the app had zero
// caches and was completely dead offline while still calling itself a PWA.

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      'https://hospitable-insight-production-550c.up.railway.app/api/v1',
  },
  headers: async () => {
    return [
      {
        // next-pwa's real generated service worker — force revalidation on
        // every load so an update is never stuck behind a cached copy.
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
