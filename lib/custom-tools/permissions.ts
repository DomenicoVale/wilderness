const CUSTOM_TOOL_PERMISSION: Browser.permissions.Permissions = {
  permissions: ["userScripts"],
};

export const isFirefoxBuild = () => Boolean(browser.runtime.getManifest().browser_specific_settings?.gecko);

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "";
};

export const getMissingCustomToolPermissionMessage = () =>
  isFirefoxBuild()
    ? "The extension requires the 'userScripts' permission to enable custom tools."
    : "Enable Allow User Scripts in chrome://extensions for Wilderness, then reload the page.";

export const getUserScriptsAvailabilityErrorMessage = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();
  if (!message) {
    return "User Scripts API unavailable.";
  }

  if (message.includes("developer mode")) {
    return "Enable Developer mode in chrome://extensions to use custom tools on this browser version.";
  }

  if (message.includes("allow user scripts")) {
    return "Enable Allow User Scripts in chrome://extensions for Wilderness, then reload the page.";
  }

  return getErrorMessage(error);
};

export const getCustomToolBridgeUnavailableMessage = () =>
  `Custom tool bridge is unavailable. ${getMissingCustomToolPermissionMessage()}`;

export const hasCustomToolPermission = async () => {
  if (!browser.permissions || typeof browser.permissions.contains !== "function") {
    return true;
  }

  try {
    return await browser.permissions.contains(CUSTOM_TOOL_PERMISSION);
  } catch (error) {
    console.warn("[wilderness] Unable to inspect the custom tool permission state.", error);
    return false;
  }
};

export const requestCustomToolPermission = async () => {
  if (!browser.permissions || typeof browser.permissions.request !== "function") {
    return true;
  }

  try {
    return await browser.permissions.request(CUSTOM_TOOL_PERMISSION);
  } catch (error) {
    console.warn("[wilderness] Failed to request the custom tool permission.", error);
    return false;
  }
};

export const openChromeExtensionsSettingsForCurrentExtension = async () => {
  if (isFirefoxBuild()) {
    return false;
  }

  const extensionId = browser.runtime.id;
  const detailsUrl = `chrome://extensions/?id=${encodeURIComponent(extensionId)}`;

  try {
    await browser.tabs.create({ url: detailsUrl });
    return true;
  } catch (error) {
    console.warn("[wilderness] Failed to open Chrome extensions settings.", error);
    return false;
  }
};

export const checkUserScriptsAvailability = async () => {
  const hasPermission = await hasCustomToolPermission();
  if (!hasPermission) {
    return {
      ok: false,
      error: getMissingCustomToolPermissionMessage(),
    };
  }

  if (!browser.userScripts || typeof browser.userScripts.getScripts !== "function") {
    return {
      ok: false,
      error: getMissingCustomToolPermissionMessage(),
    };
  }

  try {
    await browser.userScripts.getScripts();
    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      error: getUserScriptsAvailabilityErrorMessage(error),
    };
  }
};
