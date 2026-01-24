const INFO_STYLE_ID = "wilderness-info-styles";
const INFO_STYLES = `
.wilderness-info-tip {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 2147483647;
  pointer-events: auto;
  font-family: ui-sans-serif, system-ui, sans-serif;
  color: #f9fafb;
}

.wilderness-info-outline {
  position: fixed;
  left: 0;
  top: 0;
  pointer-events: none;
  z-index: 2147483646;
  border: 2px solid #38bdf8;
  border-radius: 6px;
  box-sizing: border-box;
}

.wilderness-info-outline[data-variant="pinned"] {
  border-color: #22c55e;
}

.wilderness-info-outline[data-variant="hover"] {
  border-color: #38bdf8;
}

.wilderness-info-tip__card {
  min-width: 240px;
  max-width: 360px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.95);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(8px);
}

.wilderness-info-tip[data-pinned="true"] .wilderness-info-tip__card {
  border-color: rgba(34, 197, 94, 0.65);
}

.wilderness-info-tip__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  cursor: grab;
  user-select: none;
}

.wilderness-info-tip__title {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  word-break: break-all;
}

.wilderness-info-tip__size {
  font-size: 11px;
  color: #94a3b8;
}

.wilderness-info-tip__list {
  padding: 8px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow: auto;
}

.wilderness-info-tip__row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  font-size: 11px;
  color: #e2e8f0;
}

.wilderness-info-tip__row[data-has-swatch="true"] {
  grid-template-columns: auto auto 1fr;
  align-items: center;
}

.wilderness-info-tip__row[data-inline="true"] .wilderness-info-tip__prop {
  color: #fbbf24;
}

.wilderness-info-tip__prop {
  font-weight: 600;
  color: #cbd5f5;
}

.wilderness-info-tip__value {
  color: #e2e8f0;
  word-break: break-word;
}

.wilderness-info-tip__swatch {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.wilderness-info-tip__empty {
  font-size: 11px;
  color: #94a3b8;
  padding: 6px 0;
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
