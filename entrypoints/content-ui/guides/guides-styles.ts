const GUIDES_STYLE_ID = "wilderness-guides-styles";
const GUIDES_STYLES = `
.wilderness-guide-box,
.wilderness-distance,
.wilderness-gridlines {
  position: fixed;
  left: 0;
  top: 0;
  pointer-events: none;
  z-index: 2147483647;
  box-sizing: border-box;
}

.wilderness-guide-box__box {
  position: absolute;
  inset: 0;
  border: 2px solid #8b5cf6;
  box-sizing: border-box;
}

.wilderness-guide-box__label {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border-radius: 6px;
  background: #111827;
  color: #f9fafb;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 11px;
  line-height: 1;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.35);
}

.wilderness-guide-box__label--width {
  left: 50%;
  top: -24px;
  transform: translateX(-50%);
}

.wilderness-guide-box__label--height {
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
}

.wilderness-distance__line {
  position: absolute;
  left: 0;
  top: 0;
  background: #22c55e;
}

.wilderness-distance__label {
  position: absolute;
  padding: 2px 6px;
  border-radius: 6px;
  background: #111827;
  color: #f9fafb;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 11px;
  line-height: 1;
  transform: translate(-50%, -50%);
  white-space: nowrap;
}

.wilderness-gridlines {
  width: 100%;
  height: 100%;
}

.wilderness-gridlines__svg {
  width: 100%;
  height: 100%;
}

.wilderness-gridlines__svg line {
  stroke: #f59e0b;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}
`;

export const ensureGuidesStyles = () => {
  if (document.getElementById(GUIDES_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = GUIDES_STYLE_ID;
  style.textContent = GUIDES_STYLES;

  const parent = document.head ?? document.documentElement;
  if (!parent) {
    console.warn("[Guides] Unable to inject styles: no document root.");
    return;
  }

  parent.append(style);
};

export const removeGuidesStyles = () => {
  const style = document.getElementById(GUIDES_STYLE_ID);
  if (!style) {
    return;
  }

  style.remove();
};
