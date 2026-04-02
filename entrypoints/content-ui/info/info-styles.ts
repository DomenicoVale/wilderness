const INFO_STYLE_ID = "wilderness-info-styles";
const INFO_STYLES = `
.wilderness-info-tip {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 2147483647;
  pointer-events: auto;
  font-family: "Courier New", Courier, monospace;
  color: #e0e0e0;
}

.wilderness-info-outline {
  position: absolute;
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

.wilderness-info-tip__card {
  min-width: 240px;
  max-width: 360px;
  border-radius: 0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.wilderness-info-tip[data-pinned="true"] .wilderness-info-tip__card {
  border-color: rgba(34, 197, 94, 0.8);
}

.wilderness-info-tip__header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  cursor: grab;
  user-select: none;
}

.wilderness-info-tip__title {
  font-size: 11px;
  font-weight: 600;
  color: #e0e0e0;
  word-break: break-all;
}

.wilderness-info-tip__size {
  font-size: 10px;
  color: #cbd5e1;
}

.wilderness-info-tip__list {
  padding: 8px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow: auto;
}

.wilderness-info-tip__row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  font-size: 10px;
  color: #e0e0e0;
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
  color: #cbd5e1;
}

.wilderness-info-tip__value {
  color: #e0e0e0;
  word-break: break-word;
}

.wilderness-info-tip__swatch {
  width: 10px;
  height: 10px;
  border-radius: 0;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.wilderness-info-tip__empty {
  font-size: 10px;
  color: #cbd5e1;
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
