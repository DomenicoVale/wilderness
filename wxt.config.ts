import { viteStaticCopy } from "vite-plugin-static-copy";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    optimizeDeps: {
      entries: ["entrypoints/**/*.{ts,tsx,html}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    },
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: "node_modules/monaco-editor/min/vs/**/*",
            dest: "monaco/vs",
          },
        ],
      }),
    ],
  }),
  webExt: {
    startUrls: ["https://www.google.com"],
  },
  manifest: {
    action: {
      default_title: "wilderness",
    },
    permissions: ["scripting", "storage", "tabs"],
    host_permissions: ["<all_urls>"],
  },
});
