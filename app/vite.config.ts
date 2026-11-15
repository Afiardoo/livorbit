import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base "./" so the build works on any static host (GitHub Pages, Vercel, a USB stick on a spacecraft)
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
