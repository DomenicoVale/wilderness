import { OPEN_CUSTOM_TOOL_EDITOR_MESSAGE } from "./messages";

export const openCustomToolsEditor = async () => {
  try {
    await browser.runtime.sendMessage({
      type: OPEN_CUSTOM_TOOL_EDITOR_MESSAGE,
    });
  } catch (error) {
    console.warn("[wilderness] Unable to open custom tools editor.", error);
  }
};
