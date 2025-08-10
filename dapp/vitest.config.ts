import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import type { PluginOption } from "vite";

export default defineConfig({
  plugins: [react()] as PluginOption[],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"], // create if you want RTL matchers
    css: true
  }
});
