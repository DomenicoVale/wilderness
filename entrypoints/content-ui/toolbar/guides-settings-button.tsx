import { SlidersHorizontal } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { getToolbarButtonClassName, toolbarIconClassName } from "./toolbar-button-styles";

type GuidesSettingsButtonProps = {
  enabled: boolean;
  onToggle: () => void;
};

export const GuidesSettingsButton = ({ enabled, onToggle }: GuidesSettingsButtonProps) => {
  return (
    <Button
      size="sm"
      variant="secondary"
      aria-pressed={enabled}
      aria-label="Toggle always showing selection dimensions"
      className={getToolbarButtonClassName(enabled)}
      onClick={onToggle}
    >
      <SlidersHorizontal className={toolbarIconClassName} aria-hidden="true" />
      <span>Always show dims</span>
    </Button>
  );
};
