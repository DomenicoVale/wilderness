import type { CustomTool } from "./store";

export type RunReason = "enable" | "load" | "disable";
export type RunAction = "setup" | "cleanup";

export type CustomToolBridgeResponse = {
  ok: boolean;
  error?: string;
};

export const CUSTOM_TOOL_BRIDGE_COMMAND_EVENT = "wilderness:custom-tool-command";
export const CUSTOM_TOOL_BRIDGE_RESULT_EVENT = "wilderness:custom-tool-result";
export const CUSTOM_TOOL_BRIDGE_READY_ATTRIBUTE = "data-wilderness-custom-tool-bridge";
export const CUSTOM_TOOL_BRIDGE_READY_VALUE = "ready";
export const CUSTOM_TOOL_BRIDGE_TIMEOUT_MS = 1500;

export const isCustomToolBridgeReady = () =>
  document.documentElement?.getAttribute(CUSTOM_TOOL_BRIDGE_READY_ATTRIBUTE) === CUSTOM_TOOL_BRIDGE_READY_VALUE;

export const waitForCustomToolBridge = async () => {
  if (isCustomToolBridgeReady()) {
    return true;
  }

  return await new Promise<boolean>((resolve) => {
    let settled = false;
    let timeoutId = 0;
    let observer: MutationObserver | null = null;

    const finish = (ready: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      observer?.disconnect();
      resolve(ready);
    };

    const checkReady = () => {
      if (isCustomToolBridgeReady()) {
        finish(true);
      }
    };

    observer = new MutationObserver(checkReady);

    const root = document.documentElement;
    if (root) {
      observer.observe(root, {
        attributes: true,
        attributeFilter: [CUSTOM_TOOL_BRIDGE_READY_ATTRIBUTE],
      });
    } else {
      observer.observe(document, {
        childList: true,
        subtree: true,
      });
    }

    timeoutId = window.setTimeout(() => {
      finish(isCustomToolBridgeReady());
    }, CUSTOM_TOOL_BRIDGE_TIMEOUT_MS);

    checkReady();
  });
};

const createRequestId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `wilderness-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const runCustomToolViaBridge = async ({
  tool,
  action,
}: {
  tool: CustomTool;
  action: RunAction;
}): Promise<CustomToolBridgeResponse> =>
  await new Promise<CustomToolBridgeResponse>((resolve) => {
    const requestId = createRequestId();
    let timeoutId = 0;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener(CUSTOM_TOOL_BRIDGE_RESULT_EVENT, handleResult as EventListener);
    };

    const handleResult = (event: Event) => {
      if (!(event instanceof CustomEvent) || typeof event.detail !== "string") {
        return;
      }

      let payload: { requestId?: string; ok?: boolean; error?: string } | null = null;

      try {
        payload = JSON.parse(event.detail) as { requestId?: string; ok?: boolean; error?: string };
      } catch (error) {
        console.warn("[wilderness] Failed to parse custom tool bridge response.", error);
        return;
      }

      if (payload?.requestId !== requestId) {
        return;
      }

      cleanup();
      resolve({
        ok: Boolean(payload.ok),
        error: payload.error,
      });
    };

    document.addEventListener(CUSTOM_TOOL_BRIDGE_RESULT_EVENT, handleResult as EventListener);

    timeoutId = window.setTimeout(() => {
      cleanup();
      resolve({
        ok: false,
        error: "Timed out waiting for the custom tool bridge.",
      });
    }, CUSTOM_TOOL_BRIDGE_TIMEOUT_MS);

    document.dispatchEvent(
      new CustomEvent(CUSTOM_TOOL_BRIDGE_COMMAND_EVENT, {
        detail: JSON.stringify({
          requestId,
          action,
          tool: {
            id: tool.id,
            name: tool.name,
            code: tool.code,
          },
        }),
      })
    );
  });
