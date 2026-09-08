import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    // Copy FFmpeg WASM from node_modules to public/ffmpeg/ so the files are
    // served from the same origin instead of an external CDN.
    {
      name: 'copy-ffmpeg-wasm',
      buildStart() {
        const src = 'node_modules/@ffmpeg/core/dist/esm';
        const dest = 'public/ffmpeg';
        fs.mkdirSync(dest, { recursive: true });
        for (const file of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
          fs.copyFileSync(`${src}/${file}`, `${dest}/${file}`);
        }
      },
    },
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['kaizen-logo.png', 'apple-touch-icon.png', 'icon-192x192.png', 'icon-512x512.png', 'robots.txt'],
      manifest: {
        name: 'Kaizen Afrika - Progress, Every Day',
        short_name: 'Kaizen Afrika',
        description: 'Empowering businesses to make progress, every day.',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        // ?mode=standalone signals the SW to skip cache on the very first
        // paint, preventing the iOS hydration freeze on a fresh install.
        start_url: '/?mode=standalone',
        scope: '/',
        launch_handler: { client_mode: 'navigate-existing' },
        icons: [
          // "any" — standard icon used on Android home screen and in the browser UI
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          // "maskable" — safe-zone padded icon: Android scales the padding,
          // keeping the actual logo centred and correctly sized on the splash screen
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ]
      },
      workbox: {
        // skipWaiting: new SW calls self.skipWaiting() immediately during install,
        // so it never sits in "waiting" state. Combined with clientsClaim it takes
        // over all open tabs the moment it activates, firing controllerchange on
        // every client so AutoUpdate.tsx can trigger a silent reload.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Exclude FFmpeg WASM from precache — it's 32 MB and handled by runtimeCaching below.
        globIgnores: ['**\/ffmpeg\/**'],
        runtimeCaching: [
          // Navigation (HTML shell) — NetworkFirst with a tight timeout.
          // On every route navigation the browser tries the network first.
          // If the server returns a new index.html (new deploy), the SW caches it
          // so the next cold open on iOS also gets the latest shell.
          // 3 s timeout: fast enough for good UX, generous enough for slow mobile.
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
            handler: 'NetworkFirst' as const,
            options: {
              cacheName: 'navigation-cache',
              networkTimeoutSeconds: 3,
            },
          },
          {
            // Auth endpoints only — always fresh (security sensitive).
            // Storage is intentionally excluded: the SW clones large request
            // bodies to cache them, which exhausts SW memory on mobile and
            // causes "Failed to fetch" on file uploads.
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkFirst' as const,
            options: {
              cacheName: 'supabase-auth-cache',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
            },
          },
          {
            // Kaizen Link public profile tables — NetworkFirst with no timeout so
            // mobile users on slow connections always get real data rather than a
            // cache miss. fetch() rejects immediately when there is no connectivity,
            // so the cache fallback still kicks in instantly on offline devices.
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*(?:link_profiles|link_buttons|link_social_icons)/i,
            handler: 'NetworkFirst' as const,
            options: {
              cacheName: 'link-profile-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
            },
          },
          {
            // REST read data — stale-while-revalidate: instant load, fresh data
            // in the background. Returning users see content with zero wait.
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'StaleWhileRevalidate' as const,
            options: {
              cacheName: 'supabase-rest-cache',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            // FFmpeg WASM — CacheFirst with a 1-year TTL. The files are served
            // from our own origin so the first fetch is reliable, and every
            // subsequent video conversion on that device is instant (from SW cache).
            urlPattern: /\/ffmpeg\/.*/,
            handler: 'CacheFirst' as const,
            options: {
              cacheName: 'ffmpeg-wasm-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // JS/CSS chunks — CacheFirst: content-hashed filenames guarantee a
            // new deploy produces new URLs, so a cached chunk is never stale.
            // Cold opens load from disk with zero network round-trips.
            urlPattern: /\.(?:js|css)$/i,
            handler: 'CacheFirst' as const,
            options: {
              cacheName: 'static-assets-cache',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Fonts and images — CacheFirst with a 90-day TTL.
            urlPattern: /\.(?:woff2?|ttf|eot|png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst' as const,
            options: {
              cacheName: 'assets-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      }
    })
  ],
  optimizeDeps: {
    include: ['recharts'],
    // @ffmpeg packages are ES modules with top-level await — Vite must not pre-bundle them.
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // recharts + victory-vendor: omitted from manual chunks intentionally.
          // Rollup's natural chunking co-locates them with the lazy Admin chunk,
          // avoiding the TDZ crash caused by incorrect module init order when
          // Rollup concatenates victory-vendor's circular deps into a forced chunk.
          if (id.includes('html2canvas') || id.includes('jspdf'))     return 'vendor-pdf';
          if (id.includes('framer-motion'))                            return 'vendor-motion';
          if (id.includes('@supabase'))                                return 'vendor-supabase';
          if (id.includes('@tanstack'))                                return 'vendor-query';
          if (id.includes('@radix-ui'))                                return 'vendor-ui';
          if (id.includes('lucide-react'))                             return 'vendor-icons';
          if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) return 'vendor-react';
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
