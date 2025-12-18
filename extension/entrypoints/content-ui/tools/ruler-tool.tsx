import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { rectFromEl, toPx, isIgnoredTarget } from '../utils';
import type { RulerMeasurement } from '../types';

export function useRulerTool(active: boolean) {
  const [hoverEl, setHoverEl] = useState<Element | null>(null);
  const [selectedA, setSelectedA] = useState<Element | null>(null);
  const [selectedB, setSelectedB] = useState<Element | null>(null);

  const clearSelection = React.useCallback(() => {
    setSelectedA(null);
    setSelectedB(null);
    setHoverEl(null);
  }, []);

  useEffect(() => {
    if (!active) {
      setHoverEl(null);
      clearSelection();
      return;
    }

    const onMove = (e: MouseEvent) => {
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

      if (!selectedA || (selectedA && selectedB)) {
        setSelectedA(el);
        setSelectedB(null);
        return;
      }

      if (selectedA && !selectedB) {
        setSelectedB(el);
      }
    };

    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('click', onClick, true);
    };
  }, [active, selectedA, selectedB, clearSelection]);

  const hoverRect = useMemo(() => {
    if (!hoverEl) return null;
    return rectFromEl(hoverEl);
  }, [hoverEl]);

  const rectA = useMemo(() => {
    if (!selectedA) return null;
    return rectFromEl(selectedA);
  }, [selectedA]);

  const rectB = useMemo(() => {
    if (!selectedB) return null;
    return rectFromEl(selectedB);
  }, [selectedB]);

  const measurement = useMemo((): RulerMeasurement | null => {
    if (!rectA || !rectB) return null;

    const aLeft = rectA.left;
    const aTop = rectA.top;
    const aRight = rectA.left + rectA.width;
    const aBottom = rectA.top + rectA.height;

    const bLeft = rectB.left;
    const bTop = rectB.top;
    const bRight = rectB.left + rectB.width;
    const bBottom = rectB.top + rectB.height;

    const gapX = Math.max(0, Math.max(aLeft - bRight, bLeft - aRight));
    const gapY = Math.max(0, Math.max(aTop - bBottom, bTop - aBottom));

    const ax = aLeft + rectA.width / 2;
    const ay = aTop + rectA.height / 2;
    const bx = bLeft + rectB.width / 2;
    const by = bTop + rectB.height / 2;

    return {
      gapX,
      gapY,
      aCenter: { x: ax, y: ay },
      bCenter: { x: bx, y: by },
    };
  }, [rectA, rectB]);

  return {
    hoverRect,
    rectA,
    rectB,
    measurement,
    clearSelection,
  };
}

export function RulerTool({
  hoverRect,
  rectA,
  rectB,
  measurement,
}: {
  hoverRect: ReturnType<typeof rectFromEl> | null;
  rectA: ReturnType<typeof rectFromEl> | null;
  rectB: ReturnType<typeof rectFromEl> | null;
  measurement: RulerMeasurement | null;
}) {
  return (
    <>
      {hoverRect && (
        <div data-testid="wilderness-ruler-hover" className="wilderness-ruler-hover">
          <div
            data-testid="wilderness-ruler-hover-box"
            className="wilderness-ruler-box"
            style={{
              left: `${hoverRect.left}px`,
              top: `${hoverRect.top}px`,
              width: `${hoverRect.width}px`,
              height: `${hoverRect.height}px`,
            }}
          />
          <div
            data-testid="wilderness-ruler-hover-label"
            className="wilderness-ruler-label"
            style={{
              left: `${hoverRect.left}px`,
              top: `${Math.max(0, hoverRect.top - 22)}px`,
            }}
          >
            {toPx(hoverRect.width)} × {toPx(hoverRect.height)}
          </div>
        </div>
      )}

      {rectA && (
        <div data-testid="wilderness-ruler-selected-a" className="wilderness-ruler-selected">
          <div
            data-testid="wilderness-ruler-selected-a-box"
            className="wilderness-ruler-box wilderness-ruler-box--selected"
            style={{
              left: `${rectA.left}px`,
              top: `${rectA.top}px`,
              width: `${rectA.width}px`,
              height: `${rectA.height}px`,
            }}
          />
        </div>
      )}

      {rectB && (
        <div data-testid="wilderness-ruler-selected-b" className="wilderness-ruler-selected">
          <div
            data-testid="wilderness-ruler-selected-b-box"
            className="wilderness-ruler-box wilderness-ruler-box--selected"
            style={{
              left: `${rectB.left}px`,
              top: `${rectB.top}px`,
              width: `${rectB.width}px`,
              height: `${rectB.height}px`,
            }}
          />
        </div>
      )}

      {measurement && (
        <svg
          data-testid="wilderness-ruler-measurement"
          className="wilderness-ruler-svg"
          width="100%"
          height="100%"
          viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
          preserveAspectRatio="none"
        >
          <line
            x1={measurement.aCenter.x}
            y1={measurement.aCenter.y}
            x2={measurement.bCenter.x}
            y2={measurement.bCenter.y}
            stroke="rgba(56, 189, 248, 0.95)"
            strokeWidth="2"
          />
        </svg>
      )}

      {measurement && (
        <div
          data-testid="wilderness-ruler-distance"
          className="wilderness-ruler-distance"
          style={{
            left: `${(measurement.aCenter.x + measurement.bCenter.x) / 2}px`,
            top: `${(measurement.aCenter.y + measurement.bCenter.y) / 2}px`,
          }}
        >
          <div data-testid="wilderness-ruler-distance-x">X {toPx(measurement.gapX)}</div>
          <div data-testid="wilderness-ruler-distance-y">Y {toPx(measurement.gapY)}</div>
        </div>
      )}
    </>
  );
}

export function RulerPanel() {
  return (
    <div data-testid="wilderness-ruler-help">
      Click an element to set selection A, then click another element to measure distance. Press ESC to clear.
    </div>
  );
}

