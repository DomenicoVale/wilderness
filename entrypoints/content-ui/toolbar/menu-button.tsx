import { PanelTop } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { getToolbarButtonClassName, toolbarIconClassName } from "./toolbar-button-styles";

const MENU_ITEMS = [
  { label: "Inspect styles", value: "inspect" },
  { label: "Capture colors", value: "colors" },
  { label: "Log DOM info", value: "dom-info" },
] as const;

export const MenuButton = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="secondary" aria-label="Open tools menu" className={getToolbarButtonClassName()}>
          <PanelTop className={toolbarIconClassName} aria-hidden="true" />
          <span>Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" sideOffset={10} className="w-56">
        {MENU_ITEMS.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onSelect={() => {
              console.info(`[wilderness] Selected menu: ${item.value}`);
            }}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
