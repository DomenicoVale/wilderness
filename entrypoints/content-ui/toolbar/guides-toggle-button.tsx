import { Ruler } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { GUIDES_SETTINGS_EVENT, TOGGLE_GUIDES_EVENT } from "../../../lib/events";
import { setToolState } from "../tool-state";
import { getToolbarButtonClassName, toolbarIconClassName } from "./toolbar-button-styles";
export type GuidesSettings = {
  alwaysShowDimensions: boolean;
  keepPairDistances: boolean;
};

type GuidesToggleButtonProps = {
  enabled: boolean;
  settings: GuidesSettings;
  onHoverWhileActive?: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
};

export const GuidesToggleButton = ({ enabled, settings, onHoverWhileActive, buttonRef }: GuidesToggleButtonProps) => {
  const handleToggle = () => {
    const next = !enabled;
    setToolState({ guidesEnabled: next });
    window.dispatchEvent(
      new CustomEvent(TOGGLE_GUIDES_EVENT, {
        detail: { enabled: next },
      })
    );
    if (!next) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(GUIDES_SETTINGS_EVENT, {
        detail: settings,
      })
    );
  };

  return (
    <Button
      ref={buttonRef}
      size="sm"
      variant="secondary"
      onClick={handleToggle}
      onMouseEnter={() => {
        if (!enabled) {
          return;
        }

        onHoverWhileActive?.();
      }}
      aria-pressed={enabled}
      aria-label="Toggle guides ruler"
      className={getToolbarButtonClassName(enabled)}
    >
      <Ruler className={toolbarIconClassName} aria-hidden="true" />
      <span>Guides</span>
    </Button>
  );
};
