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
import { setActiveCustomToolId, useCustomToolsStore } from "../../../lib/custom-tools-store";

export const CustomToolsButton = () => {
  const tools = useCustomToolsStore((state) => state.tools);
  const activeToolId = useCustomToolsStore((state) => state.activeToolId);
  const status = useCustomToolsStore((state) => state.status);

  const activeTool = tools.find((tool) => tool.id === activeToolId) ?? null;
  const label = activeTool?.name ?? "Custom tool";

  const handleCreate = () => {
    void openCustomToolsEditor();
  };

  const handleSelectTool = (toolId: string) => {
    const tool = tools.find((item) => item.id === toolId);
    if (!tool) {
      console.warn("[wilderness] Unable to find selected custom tool.");
      return;
    }

    void setActiveCustomToolId(tool.id);
    void runCustomTool({ tool, reason: "enable" });
  };

  if (status === "loading" || tools.length === 0) {
    return (
      <Button size="sm" variant="secondary" onClick={handleCreate} aria-label="Create custom tool">
        Custom tool
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="secondary" aria-label="Select custom tool">
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        {tools.map((tool) => (
          <DropdownMenuItem
            key={tool.id}
            onSelect={() => {
              handleSelectTool(tool.id);
            }}
          >
            {tool.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleCreate}>Create new tool</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
