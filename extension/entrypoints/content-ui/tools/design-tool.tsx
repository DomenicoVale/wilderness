import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import Moveable from 'react-moveable';
import { rectFromEl, isIgnoredTarget } from '../utils';

type Props = {
  active: boolean;
  onClear?: React.MutableRefObject<(() => void) | null>;
};

export function useDesignTool(active: boolean) {
  const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
  const [frame, setFrame] = useState({ translate: [0, 0] as [number, number] });

  const clearSelection = React.useCallback(() => {
    setSelectedEl(null);
    setFrame({ translate: [0, 0] });
  }, []);

  useEffect(() => {
    if (!active) {
      clearSelection();
      return;
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (isIgnoredTarget(target)) return;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || isIgnoredTarget(el)) return;

      e.preventDefault();
      e.stopPropagation();

      const ht = el instanceof HTMLElement ? el : el.closest<HTMLElement>('*');
      if (!ht) return;

      setSelectedEl(ht);
      setFrame({ translate: [0, 0] });
    };

    window.addEventListener('click', onClick, true);
    return () => window.removeEventListener('click', onClick, true);
  }, [active, clearSelection]);

  const selectedRect = useMemo(() => {
    if (!selectedEl) return null;
    return rectFromEl(selectedEl);
  }, [selectedEl]);

  return {
    selectedEl,
    selectedRect,
    frame,
    setFrame,
    clearSelection,
  };
}

export function DesignTool({
  selectedEl,
  selectedRect,
  frame,
  setFrame,
}: {
  selectedEl: HTMLElement | null;
  selectedRect: ReturnType<typeof rectFromEl> | null;
  frame: { translate: [number, number] };
  setFrame: React.Dispatch<React.SetStateAction<{ translate: [number, number] }>>;
}) {
  return (
    <>
      {selectedRect && (
        <div data-testid="wilderness-design-selection" className="wilderness-design-selection">
          <div
            data-testid="wilderness-design-selection-box"
            className="wilderness-design-box"
            style={{
              left: `${selectedRect.left}px`,
              top: `${selectedRect.top}px`,
              width: `${selectedRect.width}px`,
              height: `${selectedRect.height}px`,
            }}
          />
        </div>
      )}

      {selectedEl && (
        <div data-testid="wilderness-design-moveable" className="wilderness-design-moveable">
          <Moveable
            target={selectedEl}
            draggable
            resizable
            keepRatio={false}
            origin={false}
            renderDirections={['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w']}
            onDragStart={() => {
              const existing = selectedEl.style.transform;
              if (!existing) {
                setFrame({ translate: [0, 0] });
              }
            }}
            onDrag={({ target, beforeTranslate }) => {
              const [x, y] = beforeTranslate;
              setFrame({ translate: [x, y] });
              (target as HTMLElement).style.transform = `translate(${x}px, ${y}px)`;
            }}
            onResizeStart={({ target }) => {
              const el = target as HTMLElement;
              const cs = getComputedStyle(el);
              if (!el.style.width) el.style.width = cs.width;
              if (!el.style.height) el.style.height = cs.height;
            }}
            onResize={({ target, width, height, drag }) => {
              const el = target as HTMLElement;
              el.style.width = `${width}px`;
              el.style.height = `${height}px`;
              const [x, y] = drag.beforeTranslate;
              setFrame({ translate: [x, y] });
              el.style.transform = `translate(${x}px, ${y}px)`;
            }}
          />
        </div>
      )}
    </>
  );
}

type DesignPanelProps = {
  selectedEl: HTMLElement | null;
  onClearSelection: () => void;
};

export function DesignPanel({ selectedEl, onClearSelection }: DesignPanelProps) {
  return (
    <div data-testid="wilderness-design-panel">
      <div data-testid="wilderness-design-help" className="wilderness-muted">
        Click an element to select it, then drag or resize. Press ESC to clear.
      </div>
      <div data-testid="wilderness-design-actions" style={{ marginTop: '10px' }}>
        <button
          type="button"
          data-testid="wilderness-design-clear"
          className="wilderness-button"
          onClick={onClearSelection}
          disabled={!selectedEl}
        >
          Clear selection
        </button>
      </div>
    </div>
  );
}

