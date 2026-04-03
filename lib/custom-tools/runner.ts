import { type CustomToolBridgeResponse, type RunReason, runCustomToolViaBridge, waitForCustomToolBridge } from "./bridge";
import { ENSURE_CUSTOM_TOOL_BRIDGE_MESSAGE } from "./messages";
import { getCustomToolBridgeUnavailableMessage } from "./permissions";
import type { CustomTool } from "./store";

const requestBridgeInjection = async () => {
  try {
    const response = (await browser.runtime.sendMessage({
      type: ENSURE_CUSTOM_TOOL_BRIDGE_MESSAGE,
    })) as CustomToolBridgeResponse | undefined;

    return response ?? { ok: false, error: "Custom tool bridge injection did not return a response." };
  } catch (error) {
    console.warn("[wilderness] Unable to request the custom tool bridge.", error);
    return {
      ok: false,
      error: "Unable to request the custom tool bridge.",
    } satisfies CustomToolBridgeResponse;
  }
};

export const ensureCustomToolBridgeAvailable = async () => {
  if (await waitForCustomToolBridge()) {
    return { ok: true } satisfies CustomToolBridgeResponse;
  }

  const injection = await requestBridgeInjection();
  if (!injection.ok) {
    return injection;
  }

  const ready = await waitForCustomToolBridge();
  if (!ready) {
    return {
      ok: false,
      error: "Timed out waiting for the custom tool bridge.",
    } satisfies CustomToolBridgeResponse;
  }

  return { ok: true } satisfies CustomToolBridgeResponse;
};

export const runCustomTool = async ({
  tool,
  reason,
  action = "setup",
}: {
  tool: CustomTool;
  reason: RunReason;
  action?: "setup" | "cleanup";
}) => {
  try {
    const bridgeAvailability = await ensureCustomToolBridgeAvailable();
    if (!bridgeAvailability.ok) {
      console.warn(
        `[wilderness] Custom tool "${tool.name}" ${action} failed (${reason}).`,
        bridgeAvailability.error ?? getCustomToolBridgeUnavailableMessage()
      );
      return false;
    }

    const response = await runCustomToolViaBridge({ tool, action });

    if (!response.ok) {
      console.warn(
        `[wilderness] Custom tool "${tool.name}" ${action} failed (${reason}).`,
        response.error ?? "Unknown execution failure."
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`[wilderness] Unable to ${action} custom tool "${tool.name}" (${reason}).`, error);
    return false;
  }
};
