import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { ToolKey } from './types';
import { Toolbar } from './components/toolbar';
import { Panel } from './components/panel';
import { useRulerTool, RulerTool, RulerPanel } from './tools/ruler-tool';
import { useInfoTool, InfoTool, InfoPanel } from './tools/info-tool';
import { useDesignTool, DesignTool, DesignPanel } from './tools/design-tool';

type Props = {
  onRequestClose: () => void;
};

export default function App({ onRequestClose }: Props) {
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);

  const activeToolRef = useRef<ToolKey | null>(null);
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  // Hooks must be called unconditionally
  const rulerTool = useRulerTool(activeTool === 'ruler');
  const infoTool = useInfoTool(activeTool === 'info');
  const designTool = useDesignTool(activeTool === 'design');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeToolRef.current === 'ruler') {
          rulerTool.clearSelection();
        }
        if (activeToolRef.current === 'info') {
          infoTool.clearSelection();
        }
        if (activeToolRef.current === 'design') {
          designTool.clearSelection();
        }
        setActiveTool(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rulerTool, infoTool, designTool]);

  return (
    <div data-testid="wilderness-root">
      {activeTool === 'ruler' && (
        <RulerTool
          hoverRect={rulerTool.hoverRect}
          rectA={rulerTool.rectA}
          rectB={rulerTool.rectB}
          measurement={rulerTool.measurement}
        />
      )}

      {activeTool === 'info' && (
        <InfoTool targetRect={infoTool.targetRect} pinnedEl={infoTool.pinnedEl} />
      )}

      {activeTool === 'design' && (
        <DesignTool
          selectedEl={designTool.selectedEl}
          selectedRect={designTool.selectedRect}
          frame={designTool.frame}
          setFrame={designTool.setFrame}
        />
      )}

      {activeTool && (
        <Panel activeTool={activeTool} onClose={() => setActiveTool(null)}>
          {activeTool === 'ruler' && <RulerPanel />}
          {activeTool === 'info' && (
            <InfoPanel
              infoData={infoTool.infoData}
              pinnedEl={infoTool.pinnedEl}
              onUnpin={() => infoTool.setPinnedEl(null)}
            />
          )}
          {activeTool === 'design' && (
            <DesignPanel selectedEl={designTool.selectedEl} onClearSelection={designTool.clearSelection} />
          )}
          {activeTool !== 'ruler' && activeTool !== 'info' && activeTool !== 'design' && 'Coming soon'}
        </Panel>
      )}

      <Toolbar activeTool={activeTool} onToolSelect={setActiveTool} onClose={onRequestClose} />
    </div>
  );
}
