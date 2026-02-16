import type { CustomTool } from "./custom-tools-store";
import { RUN_CUSTOM_TOOL_MESSAGE } from "./events";

type RunReason = "enable" | "load";
type RunCustomToolResponse = {
  ok: boolean;
  error?: string;
};

export const runCustomTool = async ({ tool, reason }: { tool: CustomTool; reason: RunReason }) => {
  try {
    const response = (await browser.runtime.sendMessage({
      type: RUN_CUSTOM_TOOL_MESSAGE,
      reason,
      tool: {
        name: tool.name,
        code: tool.code,
      },
    })) as RunCustomToolResponse | undefined;

    if (!response?.ok) {
      console.warn(
        `[wilderness] Custom tool "${tool.name}" failed (${reason}).`,
        response?.error ?? "Unknown execution failure."
      );
    }
  } catch (error) {
    console.warn(`[wilderness] Unable to run custom tool "${tool.name}" (${reason}).`, error);
  }
};
