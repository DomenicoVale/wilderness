import { CircleHelp } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { TOGGLE_INFO_EVENT } from "../../../lib/events";
import { setToolState } from "../tool-state";
import { getToolbarButtonClassName, toolbarIconClassName } from "./toolbar-button-styles";

type InfoToggleButtonProps = {
  enabled: boolean;
};

export const InfoToggleButton = ({ enabled }: InfoToggleButtonProps) => {
  const handleToggle = () => {
    const next = !enabled;
    setToolState({ infoEnabled: next });
    window.dispatchEvent(
      new CustomEvent(TOGGLE_INFO_EVENT, {
        detail: { enabled: next },
      })
    );
  };

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleToggle}
      aria-pressed={enabled}
      aria-label="Toggle info inspector"
      className={getToolbarButtonClassName(enabled)}
    >
      <CircleHelp className={toolbarIconClassName} aria-hidden="true" />
      <span>Info</span>
    </Button>
  );
};
