/// <reference path="../.wxt/wxt.d.ts" />

import { createRoot } from 'react-dom/client';
import { ContentToolbar } from './content-ui/content-toolbar';
import './content-ui/style.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'wilderness-toolbar',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        const app = document.createElement('div');
        container.append(app);

        const root = createRoot(app);
        root.render(<ContentToolbar />);
        return root;
      },
      onRemove: (root) => {
        if (!root) {
          console.warn('[wilderness] Content UI root missing on cleanup.');
          return;
        }

        root.unmount();
      },
    });

    ui.mount();
  },
});
