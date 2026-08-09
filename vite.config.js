import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-180.png"],
      manifest: {
        name: "Super-todo",
        short_name: "Super-todo",
        description: "En supersmart och enkel to-do-app. Skriv en rad — appen förstår, prioriterar och planerar.",
        lang: "sv",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#f6f5f1",
        theme_color: "#4a63d8",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,webmanifest}"],
      },
    }),
  ],
  test: {
    environment: "node",
  },
});
