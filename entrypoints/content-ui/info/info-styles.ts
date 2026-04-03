const INFO_STYLE_ID = "wilderness-info-styles";
const INFO_STYLES = `
.wilderness-info-outline {
  position: fixed;
  left: 0;
  top: 0;
  pointer-events: none;
  z-index: 2147483646;
  border: 2px solid #38bdf8;
  border-radius: 0;
  box-sizing: border-box;
}

.wilderness-info-outline[data-variant="pinned"] {
  border-color: #22c55e;
}

.wilderness-info-outline[data-variant="hover"] {
  border-color: #38bdf8;
}

.wilderness-inspect-panel {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 20rem;
  height: min(66vh, calc(100vh - 32px));
  min-width: 20rem;
  max-width: calc(100vw - 32px);
  min-height: min(320px, calc(100vh - 32px));
  resize: none;
  overflow: hidden;
  max-height: calc(100vh - 32px);
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  font-family: "Courier New", Courier, monospace;
  font-size: 12px;
  letter-spacing: 0.02em;
  color: #e0e0e0;
  background: rgba(0, 0, 0, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-sizing: border-box;
  min-width: 0;
}

.wilderness-inspect-panel__resize {
  position: absolute;
  z-index: 2;
  background: transparent;
}

.wilderness-inspect-panel__resize[data-edge="top"] {
  top: -4px;
  left: 10px;
  right: 10px;
  height: 8px;
  cursor: ns-resize;
}

.wilderness-inspect-panel__resize[data-edge="right"] {
  top: 10px;
  right: -4px;
  bottom: 10px;
  width: 8px;
  cursor: ew-resize;
}

.wilderness-inspect-panel__resize[data-edge="bottom"] {
  bottom: -4px;
  left: 10px;
  right: 10px;
  height: 8px;
  cursor: ns-resize;
}

.wilderness-inspect-panel__resize[data-edge="left"] {
  top: 10px;
  left: -4px;
  bottom: 10px;
  width: 8px;
  cursor: ew-resize;
}

.wilderness-inspect-panel__resize[data-edge="top-left"] {
  top: -4px;
  left: -4px;
  width: 10px;
  height: 10px;
  cursor: nwse-resize;
}

.wilderness-inspect-panel__resize[data-edge="top-right"] {
  top: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  cursor: nesw-resize;
}

.wilderness-inspect-panel__resize[data-edge="bottom-right"] {
  right: -4px;
  bottom: -4px;
  width: 10px;
  height: 10px;
  cursor: nwse-resize;
}

.wilderness-inspect-panel__resize[data-edge="bottom-left"] {
  left: -4px;
  bottom: -4px;
  width: 10px;
  height: 10px;
  cursor: nesw-resize;
}

.wilderness-inspect-left {
  position: fixed;
  top: 16px;
  width: 26rem;
  min-width: 26rem;
  max-width: calc(100vw - 32px);
  height: min(66vh, calc(100vh - 32px));
  min-height: min(320px, calc(100vh - 32px));
  max-height: calc(100vh - 32px);
  overflow: hidden;
  resize: none;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  font-family: "Courier New", Courier, monospace;
  font-size: 12px;
  letter-spacing: 0.02em;
  color: #e0e0e0;
  background: rgba(0, 0, 0, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-sizing: border-box;
  min-width: 0;
  left: 16px;
}

.wilderness-inspect-left__resize {
  position: absolute;
  z-index: 2;
  background: transparent;
}

.wilderness-inspect-left__resize[data-edge="top"] {
  top: -4px;
  left: 10px;
  right: 10px;
  height: 8px;
  cursor: ns-resize;
}

.wilderness-inspect-left__resize[data-edge="right"] {
  top: 10px;
  right: -4px;
  bottom: 10px;
  width: 8px;
  cursor: ew-resize;
}

.wilderness-inspect-left__resize[data-edge="bottom"] {
  bottom: -4px;
  left: 10px;
  right: 10px;
  height: 8px;
  cursor: ns-resize;
}

.wilderness-inspect-left__resize[data-edge="left"] {
  top: 10px;
  left: -4px;
  bottom: 10px;
  width: 8px;
  cursor: ew-resize;
}

.wilderness-inspect-left__resize[data-edge="top-left"] {
  top: -4px;
  left: -4px;
  width: 10px;
  height: 10px;
  cursor: nwse-resize;
}

.wilderness-inspect-left__resize[data-edge="top-right"] {
  top: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  cursor: nesw-resize;
}

.wilderness-inspect-left__resize[data-edge="bottom-right"] {
  right: -4px;
  bottom: -4px;
  width: 10px;
  height: 10px;
  cursor: nwse-resize;
}

.wilderness-inspect-left__resize[data-edge="bottom-left"] {
  left: -4px;
  bottom: -4px;
  width: 10px;
  height: 10px;
  cursor: nesw-resize;
}

.wilderness-inspect-left[data-collapsed="true"] {
  width: 24px;
  min-width: 24px;
  max-width: 24px;
  height: auto;
  min-height: 40px;
  max-height: none;
  resize: none;
  overflow: visible;
}

.wilderness-inspect-left__collapsed {
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: grab;
  user-select: none;
  padding: 0;
}

.wilderness-inspect-left[data-collapsed="true"] .wilderness-inspect-left__collapsed {
  display: flex;
}

.wilderness-inspect-left[data-collapsed="true"] .wilderness-inspect-left__content {
  display: none;
}

.wilderness-inspect-left__collapsed-btn,
.wilderness-inspect-left__toggle {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e0e0e0;
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  padding: 2px 5px;
}

.wilderness-inspect-left__collapsed-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.wilderness-inspect-left__collapsed-label {
  font-size: 8px;
  line-height: 1;
  color: #a8b2c3;
  letter-spacing: 0.02em;
  text-align: center;
}

.wilderness-inspect-left__collapsed-btn:hover,
.wilderness-inspect-left__toggle:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.wilderness-inspect-left__content {
  padding: 4px 6px 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
}

.wilderness-inspect-left__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: grab;
  user-select: none;
}

.wilderness-inspect-left__header:active {
  cursor: grabbing;
}

.wilderness-inspect-left__title {
  color: #00ff88;
}

.wilderness-inspect-left__section {
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.02);
  min-width: 0;
  min-height: 0;
}

.wilderness-inspect-left__section-title {
  padding: 3px 6px 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  color: #00ff88;
  text-transform: uppercase;
}

.wilderness-inspect-tree,
.wilderness-inspect-media {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  overflow-y: auto;
  overflow-x: auto;
  padding: 6px;
  min-width: 0;
  flex: 1 1 0;
  min-height: 0;
}

.wilderness-inspect-left__section {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.wilderness-inspect-left__section:first-of-type {
  flex: 1.2 1 0;
}

.wilderness-inspect-left__section:last-of-type {
  flex: 1 1 0;
}

.wilderness-inspect-tree__row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: max-content;
  min-width: 100%;
}

.wilderness-inspect-tree__twisty {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.75);
  color: #e5e7eb;
  font: inherit;
  font-weight: 700;
  line-height: 1;
  padding: 0;
  cursor: pointer;
}

.wilderness-inspect-tree__twisty[data-empty="true"] {
  cursor: default;
  opacity: 0.6;
}

.wilderness-inspect-tree__twisty:hover:not([data-empty="true"]) {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
}

.wilderness-inspect-tree__twisty[data-fixed="true"] {
  color: #9ca3af;
  cursor: default;
}

.wilderness-inspect-tree__item {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e0e0e0;
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  text-align: left;
  padding: 3px 6px;
  min-width: 14ch;
  width: max-content;
  max-width: none;
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
  flex: 0 0 auto;
}

.wilderness-inspect-media__jump {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e0e0e0;
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  text-align: left;
  padding: 3px 6px;
  min-width: 0;
  white-space: nowrap;
  flex: 0 0 auto;
}

.wilderness-inspect-tree__item:hover,
.wilderness-inspect-media__jump:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.08);
}

.wilderness-inspect-tree__item[data-active="true"] {
  color: #00ff88;
  border-color: rgba(0, 255, 136, 0.5);
  background: rgba(0, 255, 136, 0.08);
}

.wilderness-inspect-media__item {
  display: block;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.75);
  color: #e0e0e0;
  text-decoration: none;
}

.wilderness-inspect-left[data-media-layout="wide"] .wilderness-inspect-media__item {
  display: grid;
  grid-template-columns: minmax(96px, 38%) minmax(0, 1fr);
  align-items: stretch;
}

.wilderness-inspect-media__item:hover {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.06);
}

.wilderness-inspect-media__preview {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.wilderness-inspect-left[data-media-layout="wide"] .wilderness-inspect-media__preview {
  border-bottom: none;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
  height: 100%;
}

.wilderness-inspect-media__preview--text {
  padding: 10px 8px;
  color: #a8b2c3;
}

.wilderness-inspect-media__img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 240px;
  object-fit: contain;
  background: #000;
}

.wilderness-inspect-left[data-media-layout="wide"] .wilderness-inspect-media__img {
  height: 100%;
  max-height: 180px;
}

.wilderness-inspect-media__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
}

.wilderness-inspect-media__meta-row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 4px;
  align-items: start;
}

.wilderness-inspect-media__meta-label {
  color: #a8b2c3;
}

.wilderness-inspect-media__meta-value {
  overflow-wrap: anywhere;
}

.wilderness-inspect-media__hint,
.wilderness-inspect-media__empty {
  color: #a8b2c3;
  padding: 2px 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.wilderness-inspect-panel[data-collapsed="true"] {
  width: 24px;
  min-width: 24px;
  max-width: 24px;
  min-height: 40px;
  height: auto;
  max-height: none;
  resize: none;
  overflow: visible;
}

.wilderness-inspect-panel__collapsed {
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: grab;
  user-select: none;
  padding: 0;
}

.wilderness-inspect-panel[data-collapsed="true"] .wilderness-inspect-panel__collapsed {
  display: flex;
}

.wilderness-inspect-panel[data-collapsed="true"] .wilderness-inspect-panel__content {
  display: none;
}

.wilderness-inspect-panel__collapsed-btn,
.wilderness-inspect-panel__toggle {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e0e0e0;
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  padding: 2px 5px;
}

.wilderness-inspect-panel__collapsed-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.wilderness-inspect-panel__collapsed-label {
  font-size: 8px;
  line-height: 1;
  color: #a8b2c3;
  letter-spacing: 0.02em;
  text-align: center;
}

.wilderness-inspect-panel__collapsed-btn:hover,
.wilderness-inspect-panel__toggle:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.wilderness-inspect-panel__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.wilderness-inspect-panel__header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: grab;
  user-select: none;
}

.wilderness-inspect-panel__header-top:active {
  cursor: grabbing;
}

.wilderness-inspect-panel__title {
  color: #00ff88;
}

.wilderness-inspect-panel__selector-wrap {
  position: relative;
}

.wilderness-inspect-panel__selector {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e0e0e0;
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  text-align: left;
  padding: 3px 6px;
  width: 100%;
  display: block;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-overflow: clip;
  line-height: 1.3;
}

.wilderness-inspect-panel__selector:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
}

.wilderness-inspect-panel__selector[data-copying="true"] {
  animation: wilderness-inspect-selector-strobe 360ms ease-in-out 3;
}

.wilderness-inspect-panel__copy-tooltip {
  position: absolute;
  right: 0;
  top: -20px;
  display: none;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 5px;
  border: 1px solid #00ff88;
  background: #00ff88;
  color: #052e1f;
  text-transform: uppercase;
  pointer-events: none;
  white-space: nowrap;
}

.wilderness-inspect-panel__copy-tooltip[data-visible="true"] {
  display: block;
}

.wilderness-inspect-panel__status-tooltip {
  position: absolute;
  left: 0;
  top: -20px;
  display: none;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 5px;
  text-transform: uppercase;
  pointer-events: none;
  white-space: nowrap;
  border: 1px solid #00ff88;
  background: #00ff88;
  color: #052e1f;
}

.wilderness-inspect-panel__status-tooltip[data-tone="error"] {
  border-color: #ef4444;
  background: #ef4444;
  color: #1f0a0a;
}

.wilderness-inspect-panel__status-tooltip[data-visible="true"] {
  display: block;
}

@keyframes wilderness-inspect-selector-strobe {
  0% {
    opacity: 1;
  }
  25% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
  75% {
    opacity: 0.8;
  }
  100% {
    opacity: 1;
  }
}

.wilderness-inspect-panel__content {
  padding: 4px 6px 6px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  min-width: 0;
}

.wilderness-inspect-panel__sections {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.wilderness-inspect-section {
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.02);
}

.wilderness-inspect-section__title {
  padding: 3px 6px 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  color: #00ff88;
  text-transform: uppercase;
}

.wilderness-inspect-section__rows {
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.wilderness-inspect-row {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 4px;
  align-items: start;
  min-width: 0;
}

.wilderness-inspect-label {
  color: #cbd5e1;
  line-height: 1.4;
  padding-top: 4px;
}

.wilderness-inspect-control {
  min-width: 0;
  overflow: hidden;
}

.wilderness-inspect-field,
.wilderness-inspect-select {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.75);
  color: #e0e0e0;
  font: inherit;
  letter-spacing: inherit;
  padding: 3px 4px;
}

.wilderness-inspect-select {
  cursor: pointer;
}

.wilderness-inspect-field:focus,
.wilderness-inspect-select:focus {
  outline: none;
  border-color: rgba(0, 255, 136, 0.5);
}

.wilderness-inspect-color-field {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 4px;
  align-items: center;
}

.wilderness-inspect-color {
  width: 100%;
  min-width: 0;
  height: 22px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.75);
  padding: 0;
  cursor: pointer;
}

.wilderness-inspect-segmented {
  display: grid;
  grid-template-columns: repeat(var(--segment-cols, 4), minmax(0, 1fr));
  gap: 4px;
  min-width: 0;
}

.wilderness-inspect-segmented-btn {
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.75);
  color: #e0e0e0;
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  padding: 3px 0 2px;
  min-height: 21px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.wilderness-inspect-segmented-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.wilderness-inspect-segmented-btn[data-active="true"] {
  color: #00ff88;
  border-color: rgba(0, 255, 136, 0.5);
  background: rgba(0, 255, 136, 0.08);
}

.wilderness-inspect-segmented-icon {
  display: block;
  pointer-events: none;
}

.wilderness-inspect-transform {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wilderness-inspect-transform__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.wilderness-inspect-transform__tab {
  flex: 1 1 calc(50% - 2px);
  min-width: 52px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.75);
  color: #e0e0e0;
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  padding: 4px 2px;
  text-transform: capitalize;
}

.wilderness-inspect-transform__tab[data-active="true"] {
  color: #00ff88;
  border-color: rgba(0, 255, 136, 0.5);
  background: rgba(0, 255, 136, 0.08);
}

.wilderness-inspect-transform__axis {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) minmax(72px, 98px);
  gap: 6px;
  align-items: center;
}

.wilderness-inspect-transform__axis-label {
  color: #cbd5e1;
  text-transform: uppercase;
}

.wilderness-inspect-transform__slider {
  width: 100%;
  min-width: 0;
  accent-color: #00ff88;
}

.wilderness-inspect-transform__controls {
  display: flex;
  justify-content: flex-end;
}

.wilderness-inspect-field-with-reset {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px;
  align-items: center;
}

.wilderness-inspect-reset-btn {
  width: 22px;
  height: 22px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.75);
  color: #a8b2c3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.wilderness-inspect-reset-btn:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.08);
}

.wilderness-inspect-restore {
  display: flex;
  justify-content: flex-start;
}

.wilderness-inspect-restore__button {
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.75);
  color: #e0e0e0;
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  padding: 4px 6px;
}

.wilderness-inspect-restore__button:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.08);
}

.wilderness-inspect-transform__value {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px;
  align-items: center;
}

.wilderness-inspect-transform__unit {
  color: #a8b2c3;
  font-size: 10px;
  text-transform: uppercase;
}

.wilderness-inspect-field-matrix {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
}

.wilderness-inspect-matrix-item {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.wilderness-inspect-matrix-label {
  min-width: 28px;
  flex-shrink: 0;
  color: #a8b2c3;
}

.wilderness-inspect-matrix-item .wilderness-inspect-field {
  min-width: 0;
}

.wilderness-inspect-props-list {
  max-height: 260px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.wilderness-inspect-prop-row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 4px;
  align-items: center;
  min-width: 0;
}

.wilderness-inspect-prop-row .wilderness-inspect-label {
  padding-top: 0;
  color: #a8b2c3;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wilderness-inspect-props-empty {
  color: #a8b2c3;
  padding: 2px 0;
}

.wilderness-inspect-panel__content::-webkit-scrollbar,
.wilderness-inspect-left__content::-webkit-scrollbar,
.wilderness-inspect-tree::-webkit-scrollbar,
.wilderness-inspect-media::-webkit-scrollbar,
.wilderness-inspect-props-list::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.wilderness-inspect-panel__content::-webkit-scrollbar-track,
.wilderness-inspect-left__content::-webkit-scrollbar-track,
.wilderness-inspect-tree::-webkit-scrollbar-track,
.wilderness-inspect-media::-webkit-scrollbar-track,
.wilderness-inspect-props-list::-webkit-scrollbar-track {
  background: transparent;
}

.wilderness-inspect-panel__content::-webkit-scrollbar-thumb,
.wilderness-inspect-left__content::-webkit-scrollbar-thumb,
.wilderness-inspect-tree::-webkit-scrollbar-thumb,
.wilderness-inspect-media::-webkit-scrollbar-thumb,
.wilderness-inspect-props-list::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 136, 0.55);
  border-radius: 0;
}

.wilderness-inspect-panel__content,
.wilderness-inspect-left__content,
.wilderness-inspect-tree,
.wilderness-inspect-media,
.wilderness-inspect-props-list {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 255, 136, 0.55) transparent;
}

.wilderness-inspect-panel ::selection,
.wilderness-inspect-left ::selection {
  background: rgba(255, 255, 255, 0.92);
  color: #000;
}

`;

export const ensureInfoStyles = () => {
  if (document.getElementById(INFO_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = INFO_STYLE_ID;
  style.textContent = INFO_STYLES;

  const parent = document.head ?? document.documentElement;
  if (!parent) {
    console.warn("[Info] Unable to inject styles: no document root.");
    return;
  }

  parent.append(style);
};

export const removeInfoStyles = () => {
  const style = document.getElementById(INFO_STYLE_ID);
  if (!style) {
    return;
  }

  style.remove();
};
