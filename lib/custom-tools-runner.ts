import type { CustomTool } from "./custom-tools-store";
import { RUN_CUSTOM_TOOL_MESSAGE } from "./events";

type RunReason = "enable" | "load" | "disable";
type RunAction = "setup" | "cleanup";
type RunCustomToolResponse = {
  ok: boolean;
  error?: string;
};

export const runCustomTool = async ({
  tool,
  reason,
  action = "setup",
}: {
  tool: CustomTool;
  reason: RunReason;
  action?: RunAction;
}) => {
  try {
    const response = (await browser.runtime.sendMessage({
      type: RUN_CUSTOM_TOOL_MESSAGE,
      reason,
      action,
      tool: {
        id: tool.id,
        name: tool.name,
        code: tool.code,
      },
    })) as RunCustomToolResponse | undefined;

    if (!response?.ok) {
      console.warn(
        `[wilderness] Custom tool "${tool.name}" ${action} failed (${reason}).`,
        response?.error ?? "Unknown execution failure."
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`[wilderness] Unable to ${action} custom tool "${tool.name}" (${reason}).`, error);
    return false;
  }
};
