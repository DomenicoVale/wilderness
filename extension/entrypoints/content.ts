import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './content-ui/App';
import './content-ui/style.css';

let rootEl: HTMLDivElement | null = null;
let reactRoot: ReturnType<typeof ReactDOM.createRoot> | null = null;

function mount() {
  if (reactRoot)
    return;

  rootEl = document.createElement('div');
  rootEl.id = 'wilderness-root';
  document.documentElement.appendChild(rootEl);

  reactRoot = ReactDOM.createRoot(rootEl);
  reactRoot.render(
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(App, { onRequestClose: unmount }),
    ),
  );
}

function unmount() {
  reactRoot?.unmount();
  reactRoot = null;
  rootEl?.remove();
  rootEl = null;
}

function toggle() {
  if (reactRoot)
    unmount();
  else
    mount();
}

export default defineContentScript({
  matches: ['*://*/*'],
  main() {
    browser.runtime.onMessage.addListener((message) => {
      if (message?.type === 'WILDERNESS_TOGGLE')
        toggle();
    });
  },
});
