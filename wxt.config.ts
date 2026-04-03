import { viteStaticCopy } from "vite-plugin-static-copy";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  dev: {
    server: {
      port: Number(process.env.WXT_DEV_PORT ?? "3000"),
    },
  },
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
  manifest: ({ browser }) => ({
    action: {
      default_title: "wilderness",
    },
    permissions:
      browser === "firefox"
        ? ["activeTab", "scripting", "storage", "tabs"]
        : ["activeTab", "scripting", "storage", "tabs", "userScripts"],
    ...(browser === "firefox" && {
      optional_permissions: ["userScripts"],
    }),
    host_permissions: ["<all_urls>"],
    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "wilderness@wilderness.dev",
          strict_min_version: "128.0",
        },
      },
    }),
  }),
});
