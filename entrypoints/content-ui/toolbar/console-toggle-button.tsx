import { Terminal } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { TOGGLE_CONSOLE_EVENT } from "../../../lib/events";
import { cn } from "../../../lib/utils";
import { getToolbarButtonClassName, toolbarIconClassName } from "./toolbar-button-styles";

type ConsoleToggleButtonProps = {
  isOpen: boolean;
  count: number;
};

export const ConsoleToggleButton = ({ isOpen, count }: ConsoleToggleButtonProps) => {
  const handleToggle = () => {
    window.dispatchEvent(new CustomEvent(TOGGLE_CONSOLE_EVENT));
  };

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleToggle}
      aria-pressed={isOpen}
      aria-label="Toggle console panel"
      className={getToolbarButtonClassName(isOpen)}
    >
      <Terminal className={toolbarIconClassName} aria-hidden="true" />
      <span>Console</span>
      {count > 0 ? (
        <span
          className={cn(
            "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
            isOpen ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Button>
  );
};
