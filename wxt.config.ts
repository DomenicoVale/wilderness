import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    optimizeDeps: {
      entries: [
        "entrypoints/**/*.{ts,tsx,html}",
        "components/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
      ],
    },
  }),
  manifest: {
    action: {
      default_title: "wilderness",
    },
    permissions: ["scripting"],
    host_permissions: ["<all_urls>"],
  },
});
