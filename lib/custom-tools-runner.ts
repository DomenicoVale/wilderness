import type { CustomTool } from "./custom-tools-store";

type RunReason = "enable" | "load";

export const runCustomTool = async ({ tool, reason }: { tool: CustomTool; reason: RunReason }) => {
  try {
    const runner = new Function("window", "document", "location", `"use strict";\n${tool.code}`) as (
      targetWindow: Window,
      targetDocument: Document,
      targetLocation: Location
    ) => unknown;
    const result = runner(window, document, window.location);
    if (result instanceof Promise) {
      await result;
    }
  } catch (error) {
    console.warn(`[wilderness] Custom tool "${tool.name}" failed (${reason}).`, error);
  }
};
