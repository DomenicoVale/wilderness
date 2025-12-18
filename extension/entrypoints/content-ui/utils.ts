import type { Rect, InfoData } from './types';

export function rectFromEl(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return {
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height,
  };
}

export function toPx(n: number) {
  return `${Math.round(n)}px`;
}

export function isIgnoredTarget(el: Element) {
  const root = el.closest('#wilderness-root');
  return Boolean(root);
}

export function getInfoData(el: Element): InfoData {
  const cs = getComputedStyle(el as HTMLElement);
  const rect = rectFromEl(el);
  return {
    tagName: el.tagName.toLowerCase(),
    id: (el as HTMLElement).id || '',
    className: (el as HTMLElement).className?.toString?.() || '',
    rect,
    typography: {
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      color: cs.color,
    },
    spacing: {
      margin: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
      padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
    },
    layout: {
      display: cs.display,
      position: cs.position,
      gap: cs.gap,
      justifyContent: cs.justifyContent,
      alignItems: cs.alignItems,
    },
    appearance: {
      backgroundColor: cs.backgroundColor,
      borderRadius: cs.borderRadius,
      border: cs.border,
    },
  };
}

