import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Wilderness',
    description: 'Wild design tools injected directly into the page.',
    action: {
      default_title: 'Wilderness',
      // Ensure clicking the extension icon triggers `browser.action.onClicked`
      // instead of opening a popup UI.
      default_popup: undefined,
    },
  },
});
