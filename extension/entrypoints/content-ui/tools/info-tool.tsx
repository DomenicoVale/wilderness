import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { rectFromEl, toPx, isIgnoredTarget, getInfoData } from '../utils';
import { Icon } from '../components/icon';
import type { InfoData } from '../types';

export function InfoTool({ targetRect, pinnedEl }: { targetRect: ReturnType<typeof rectFromEl> | null; pinnedEl: Element | null }) {
  if (!targetRect) return null;

  return (
    <div data-testid="wilderness-info-hover" className="wilderness-info-hover">
      <div
        data-testid="wilderness-info-hover-box"
        className="wilderness-info-box"
        style={{
          left: `${targetRect.left}px`,
          top: `${targetRect.top}px`,
          width: `${targetRect.width}px`,
          height: `${targetRect.height}px`,
        }}
      />
      <div
        data-testid="wilderness-info-hover-label"
        className="wilderness-info-label"
        style={{
          left: `${targetRect.left}px`,
          top: `${Math.max(0, targetRect.top - 22)}px`,
        }}
      >
        {toPx(targetRect.width)} × {toPx(targetRect.height)}
        {pinnedEl ? ' (pinned)' : ''}
      </div>
    </div>
  );
}

type InfoPanelProps = {
  infoData: InfoData | null;
  pinnedEl: Element | null;
  onUnpin: () => void;
};

export function useInfoTool(active: boolean) {
  const [hoverEl, setHoverEl] = useState<Element | null>(null);
  const [pinnedEl, setPinnedEl] = useState<Element | null>(null);

  const clearSelection = React.useCallback(() => {
    setPinnedEl(null);
    setHoverEl(null);
  }, []);

  useEffect(() => {
    if (!active) {
      clearSelection();
      return;
    }

    const onMove = (e: MouseEvent) => {
      if (pinnedEl) return;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || isIgnoredTarget(el)) {
        setHoverEl(null);
        return;
      }
      setHoverEl(el);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target;
      if (target instanceof Element && isIgnoredTarget(target)) return;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || isIgnoredTarget(el)) return;

      e.preventDefault();
      e.stopPropagation();
      setPinnedEl(el);
    };

    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('click', onClick, true);
    };
  }, [active, pinnedEl, clearSelection]);

  const targetEl = pinnedEl || hoverEl;
  const targetRect = useMemo(() => {
    if (!targetEl) return null;
    return rectFromEl(targetEl);
  }, [targetEl]);

  const infoData = useMemo((): InfoData | null => {
    if (!targetEl) return null;
    return getInfoData(targetEl);
  }, [targetEl]);

  return {
    targetRect,
    infoData,
    pinnedEl,
    clearSelection,
    setPinnedEl,
  };
}

export function InfoPanel({ infoData, pinnedEl, onUnpin }: InfoPanelProps) {

  if (!infoData) {
    return (
      <div data-testid="wilderness-info-empty" className="wilderness-muted">
        Hover an element to inspect. Click to pin. Press ESC to clear.
      </div>
    );
  }

  return (
    <div data-testid="wilderness-info-panel">
      <div data-testid="wilderness-info-content" className="wilderness-info">
        <div data-testid="wilderness-info-header" className="wilderness-info__header">
          <div data-testid="wilderness-info-title" className="wilderness-info__title">
            <span className="wilderness-pill">{infoData.tagName}</span>
            {infoData.id && <span className="wilderness-pill">#{infoData.id}</span>}
            {pinnedEl && <span className="wilderness-pill wilderness-pill--accent">Pinned</span>}
          </div>
          <button
            type="button"
            data-testid="wilderness-info-unpin"
            className="wilderness-button"
            onClick={onUnpin}
            disabled={!pinnedEl}
          >
            Unpin
          </button>
        </div>

        {infoData.className && (
          <div data-testid="wilderness-info-classes" className="wilderness-info__row">
            <div className="wilderness-info__row-label">
              <Icon path="M4 7h16M4 12h16M4 17h16" />
              Classes
            </div>
            <div className="wilderness-info__row-value wilderness-code">{infoData.className}</div>
          </div>
        )}

        <div data-testid="wilderness-info-dimensions" className="wilderness-info__section">
          <div className="wilderness-info__section-title">
            <Icon path="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
            Dimensions
          </div>
          <div className="wilderness-info__grid">
            <div className="wilderness-info__row">
              <div className="wilderness-info__row-label">W</div>
              <div data-testid="wilderness-info-width" className="wilderness-info__row-value">
                {toPx(infoData.rect.width)}
              </div>
            </div>
            <div className="wilderness-info__row">
              <div className="wilderness-info__row-label">H</div>
              <div data-testid="wilderness-info-height" className="wilderness-info__row-value">
                {toPx(infoData.rect.height)}
              </div>
            </div>
          </div>
        </div>

        <div data-testid="wilderness-info-typography" className="wilderness-info__section">
          <div className="wilderness-info__section-title">
            <Icon path="M4 6h16M10 6v14M14 6v14" />
            Typography
          </div>
          <div className="wilderness-info__row">
            <div className="wilderness-info__row-label">Font</div>
            <div data-testid="wilderness-info-font-family" className="wilderness-info__row-value">
              {infoData.typography.fontFamily}
            </div>
          </div>
          <div className="wilderness-info__grid">
            <div className="wilderness-info__row">
              <div className="wilderness-info__row-label">Size</div>
              <div data-testid="wilderness-info-font-size" className="wilderness-info__row-value">
                {infoData.typography.fontSize}
              </div>
            </div>
            <div className="wilderness-info__row">
              <div className="wilderness-info__row-label">Weight</div>
              <div data-testid="wilderness-info-font-weight" className="wilderness-info__row-value">
                {infoData.typography.fontWeight}
              </div>
            </div>
            <div className="wilderness-info__row">
              <div className="wilderness-info__row-label">Line</div>
              <div data-testid="wilderness-info-line-height" className="wilderness-info__row-value">
                {infoData.typography.lineHeight}
              </div>
            </div>
            <div className="wilderness-info__row">
              <div className="wilderness-info__row-label">Track</div>
              <div data-testid="wilderness-info-letter-spacing" className="wilderness-info__row-value">
                {infoData.typography.letterSpacing}
              </div>
            </div>
          </div>
          <div className="wilderness-info__row">
            <div className="wilderness-info__row-label">Color</div>
            <div className="wilderness-info__row-value">
              <span
                data-testid="wilderness-info-color-swatch"
                className="wilderness-swatch"
                style={{ background: infoData.typography.color }}
              />
              <span data-testid="wilderness-info-color" className="wilderness-code">
                {infoData.typography.color}
              </span>
            </div>
          </div>
        </div>

        <div data-testid="wilderness-info-spacing" className="wilderness-info__section">
          <div className="wilderness-info__section-title">
            <Icon path="M8 7h8M7 8v8M17 8v8M8 17h8" />
            Spacing
          </div>
          <div className="wilderness-info__row">
            <div className="wilderness-info__row-label">Margin</div>
            <div data-testid="wilderness-info-margin" className="wilderness-info__row-value wilderness-code">
              {infoData.spacing.margin}
            </div>
          </div>
          <div className="wilderness-info__row">
            <div className="wilderness-info__row-label">Padding</div>
            <div data-testid="wilderness-info-padding" className="wilderness-info__row-value wilderness-code">
              {infoData.spacing.padding}
            </div>
          </div>
        </div>

        <div data-testid="wilderness-info-layout" className="wilderness-info__section">
          <div className="wilderness-info__section-title">
            <Icon path="M4 5h16v14H4zM9 5v14M4 10h16" />
            Layout
          </div>
          <div className="wilderness-info__grid">
            <div className="wilderness-info__row">
              <div className="wilderness-info__row-label">Display</div>
              <div data-testid="wilderness-info-display" className="wilderness-info__row-value wilderness-code">
                {infoData.layout.display}
              </div>
            </div>
            <div className="wilderness-info__row">
              <div className="wilderness-info__row-label">Position</div>
              <div data-testid="wilderness-info-position" className="wilderness-info__row-value wilderness-code">
                {infoData.layout.position}
              </div>
            </div>
            <div className="wilderness-info__row">
              <div className="wilderness-info__row-label">Gap</div>
              <div data-testid="wilderness-info-gap" className="wilderness-info__row-value wilderness-code">
                {infoData.layout.gap}
              </div>
            </div>
            <div className="wilderness-info__row">
              <div className="wilderness-info__row-label">Justify</div>
              <div data-testid="wilderness-info-justify" className="wilderness-info__row-value wilderness-code">
                {infoData.layout.justifyContent}
              </div>
            </div>
            <div className="wilderness-info__row">
              <div className="wilderness-info__row-label">Align</div>
              <div data-testid="wilderness-info-align" className="wilderness-info__row-value wilderness-code">
                {infoData.layout.alignItems}
              </div>
            </div>
          </div>
        </div>

        <div data-testid="wilderness-info-appearance" className="wilderness-info__section">
          <div className="wilderness-info__section-title">
            <Icon path="M4 20h16M6 16l6-12 6 12" />
            Appearance
          </div>
          <div className="wilderness-info__row">
            <div className="wilderness-info__row-label">Background</div>
            <div className="wilderness-info__row-value">
              <span
                data-testid="wilderness-info-bg-swatch"
                className="wilderness-swatch"
                style={{ background: infoData.appearance.backgroundColor }}
              />
              <span data-testid="wilderness-info-background" className="wilderness-code">
                {infoData.appearance.backgroundColor}
              </span>
            </div>
          </div>
          <div className="wilderness-info__row">
            <div className="wilderness-info__row-label">Border</div>
            <div data-testid="wilderness-info-border" className="wilderness-info__row-value wilderness-code">
              {infoData.appearance.border}
            </div>
          </div>
          <div className="wilderness-info__row">
            <div className="wilderness-info__row-label">Radius</div>
            <div data-testid="wilderness-info-radius" className="wilderness-info__row-value wilderness-code">
              {infoData.appearance.borderRadius}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

