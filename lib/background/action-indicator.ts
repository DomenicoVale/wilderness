const DEFAULT_ACTION_TITLE = "wilderness";
const ACTION_WARNING_BADGE_TEXT = "!";
const ACTION_WARNING_BADGE_COLOR = "#f59e0b";
const ACTION_WARNING_BADGE_TEXT_COLOR = "#111827";
const ACTION_ENABLED_DOT_COLOR = "#16a34a";
const ACTION_ENABLED_DOT_RING_COLOR = "rgba(255,255,255,0.95)";
const ACTION_ICON_PATHS = {
  16: "/icon/16.png",
  32: "/icon/32.png",
  48: "/icon/48.png",
  96: "/icon/96.png",
  128: "/icon/128.png",
} as const;
const ACTION_ICON_SIZES = [16, 32, 48, 96, 128] as const;
type ActionIconSize = (typeof ACTION_ICON_SIZES)[number];

let enabledIconImageData: Record<ActionIconSize, ImageData> | null = null;

const supportsBadgeTextColor = () => "setBadgeTextColor" in browser.action;

const setDefaultActionIcon = async (tabId: number) => {
  await browser.action.setIcon({ tabId, path: ACTION_ICON_PATHS });
};

const createEnabledIconImageData = async (): Promise<Record<ActionIconSize, ImageData>> => {
  if (enabledIconImageData) {
    return enabledIconImageData;
  }

  const next = {} as Record<ActionIconSize, ImageData>;
  for (const size of ACTION_ICON_SIZES) {
    const path = ACTION_ICON_PATHS[size];
    const response = await fetch(browser.runtime.getURL(path));
    if (!response.ok) {
      throw new Error(`Failed to load icon asset: ${path}`);
    }

    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = new OffscreenCanvas(size, size);
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Unable to create offscreen canvas context.");
      }

      context.drawImage(bitmap, 0, 0, size, size);
      const radius = Math.max(2, Math.round(size * 0.2));
      const ringWidth = Math.max(1, Math.round(size * 0.1));
      const center = size - radius - 1;

      context.beginPath();
      context.fillStyle = ACTION_ENABLED_DOT_COLOR;
      context.arc(center, center, radius - ringWidth / 2, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.strokeStyle = ACTION_ENABLED_DOT_RING_COLOR;
      context.lineWidth = ringWidth;
      context.arc(center, center, radius - ringWidth / 2, 0, Math.PI * 2);
      context.stroke();

      next[size] = context.getImageData(0, 0, size, size);
    } finally {
      bitmap.close();
    }
  }

  enabledIconImageData = next;
  return next;
};

const setEnabledActionIcon = async (tabId: number) => {
  try {
    const imageData = await createEnabledIconImageData();
    await browser.action.setIcon({ tabId, imageData });
  } catch (error) {
    console.warn("[wilderness] Failed to set enabled icon image data, falling back to default icon.", error);
    await setDefaultActionIcon(tabId);
  }
};

export const setActionWarning = async (tabId: number, message: string, uiEnabled: boolean) => {
  try {
    await setDefaultActionIcon(tabId);
    await browser.action.setBadgeBackgroundColor({ tabId, color: ACTION_WARNING_BADGE_COLOR });
    if (supportsBadgeTextColor()) {
      await browser.action.setBadgeTextColor({ tabId, color: ACTION_WARNING_BADGE_TEXT_COLOR });
    }
    await browser.action.setBadgeText({ tabId, text: ACTION_WARNING_BADGE_TEXT });
    await browser.action.setTitle({
      tabId,
      title: uiEnabled ? `${DEFAULT_ACTION_TITLE}: enabled - ${message}` : `${DEFAULT_ACTION_TITLE}: ${message}`,
    });
  } catch (error) {
    console.warn("[wilderness] Failed to set action warning.", error);
  }
};

export const setActionEnabled = async (tabId: number) => {
  try {
    await browser.action.setBadgeText({ tabId, text: "" });
    await setEnabledActionIcon(tabId);
    await browser.action.setTitle({ tabId, title: `${DEFAULT_ACTION_TITLE}: enabled` });
  } catch (error) {
    console.warn("[wilderness] Failed to set enabled action state.", error);
  }
};

export const clearActionState = async (tabId: number) => {
  try {
    await setDefaultActionIcon(tabId);
    await browser.action.setBadgeText({ tabId, text: "" });
    await browser.action.setTitle({ tabId, title: DEFAULT_ACTION_TITLE });
  } catch (error) {
    console.warn("[wilderness] Failed to clear action warning.", error);
  }
};
