import type { ToolKey } from '../types';

type Props = {
  activeTool: ToolKey | null;
  onToolSelect: (tool: ToolKey) => void;
  onClose: () => void;
};

export function Toolbar({ activeTool, onToolSelect, onClose }: Props) {
  return (
    <div data-testid="wilderness-toolbar" className="wilderness-toolbar">
      <button
        type="button"
        data-testid="wilderness-tool-settings"
        className="wilderness-button"
        onClick={() => onToolSelect('settings')}
      >
        Settings
      </button>
      <button
        type="button"
        data-testid="wilderness-tool-ruler"
        className="wilderness-button"
        onClick={() => onToolSelect('ruler')}
      >
        Ruler
      </button>
      <button
        type="button"
        data-testid="wilderness-tool-info"
        className="wilderness-button"
        onClick={() => onToolSelect('info')}
      >
        Info
      </button>
      <button
        type="button"
        data-testid="wilderness-tool-design"
        className="wilderness-button"
        onClick={() => onToolSelect('design')}
      >
        Design
      </button>
      <button
        type="button"
        data-testid="wilderness-tool-user-tools"
        className="wilderness-button"
        onClick={() => onToolSelect('user-tools')}
      >
        User tools
      </button>
      <button
        type="button"
        data-testid="wilderness-tool-prompt"
        className="wilderness-button"
        onClick={() => onToolSelect('prompt')}
      >
        Prompt
      </button>
      <button
        type="button"
        data-testid="wilderness-close"
        className="wilderness-button wilderness-button--danger"
        onClick={onClose}
      >
        Close
      </button>
    </div>
  );
}

