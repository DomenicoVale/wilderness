import * as React from 'react';
import type { ToolKey } from '../types';

type Props = {
  activeTool: ToolKey;
  onClose: () => void;
  children: React.ReactNode;
};

export function Panel({ activeTool, onClose, children }: Props) {
  return (
    <div data-testid="wilderness-panel" className="wilderness-panel">
      <div className="wilderness-panel__header">
        <div data-testid="wilderness-panel-title" className="wilderness-panel__title">
          {activeTool}
        </div>
        <button
          type="button"
          data-testid="wilderness-panel-close"
          className="wilderness-button"
          onClick={onClose}
        >
          Close panel
        </button>
      </div>
      <div data-testid="wilderness-panel-body" className="wilderness-panel__body">
        {children}
      </div>
    </div>
  );
}

