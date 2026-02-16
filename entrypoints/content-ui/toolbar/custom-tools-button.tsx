import { Check, WandSparkles } from "lucide-react";
import * as React from "react";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { openCustomToolsEditor } from "../../../lib/custom-tools-actions";
import { runCustomTool } from "../../../lib/custom-tools-runner";
import { toggleActiveCustomToolId, useCustomToolsStore } from "../../../lib/custom-tools-store";
import { cn } from "../../../lib/utils";
import { getToolbarButtonClassName, toolbarIconClassName } from "./toolbar-button-styles";

export const CustomToolsButton = () => {
  const tools = useCustomToolsStore((state) => state.tools);
  const activeToolIds = useCustomToolsStore((state) => state.activeToolIds);
  const status = useCustomToolsStore((state) => state.status);

  const activeToolSet = React.useMemo(() => new Set(activeToolIds), [activeToolIds]);
  const activeTools = tools.filter((tool) => activeToolSet.has(tool.id));
  const activeCount = activeTools.length;
  const label = activeCount === 0 ? "Custom tool" : activeCount === 1 ? (activeTools[0]?.name ?? "Custom tool") : "Custom tools";

  const handleCreate = () => {
    void openCustomToolsEditor();
  };

  const handleToggleTool = (toolId: string) => {
    const tool = tools.find((item) => item.id === toolId);
    if (!tool) {
      console.warn("[wilderness] Unable to find selected custom tool.");
      return;
    }

    const isActive = activeToolSet.has(tool.id);
    void toggleActiveCustomToolId(tool.id, !isActive).then((enabled) => {
      if (!enabled) {
        return;
      }

      void runCustomTool({ tool, reason: "enable" });
    });
  };

  if (status === "loading" || tools.length === 0) {
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={handleCreate}
        aria-label="Create custom tool"
        className={getToolbarButtonClassName()}
      >
        <WandSparkles className={toolbarIconClassName} aria-hidden="true" />
        <span>Custom tool</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="secondary"
          aria-label="Select custom tool"
          className={getToolbarButtonClassName()}
          title={label}
        >
          <WandSparkles className={toolbarIconClassName} aria-hidden="true" />
          <span className="max-w-[140px] truncate">{label}</span>
          {activeCount > 0 ? (
            <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-700 px-1.5 text-[10px] font-bold leading-none text-white">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" sideOffset={10} className="w-64">
        {tools.map((tool) => (
          <DropdownMenuItem
            key={tool.id}
            className={cn("justify-between", activeToolSet.has(tool.id) && "bg-slate-100")}
            onSelect={(event) => {
              event.preventDefault();
              handleToggleTool(tool.id);
            }}
          >
            <span className="max-w-[200px] truncate">{tool.name}</span>
            {activeToolSet.has(tool.id) ? <Check className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleCreate}>
          <WandSparkles className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          Create new tool
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
