import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },

  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto", // ✅ FIX

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,ttf,woff2}"],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5000000,
      },

      devOptions: {
        enabled: true, // ✅ FIX (important for localhost)
      },

      manifest: {
        name: "NaariCare – Women's Health",
        short_name: "NaariCare",
        description: "AI-powered women's health platform",
        theme_color: "#ec4899",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/favicon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/favicon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/favicon-maskable-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/favicon-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});