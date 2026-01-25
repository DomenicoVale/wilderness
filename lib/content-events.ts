import type { createGuidesController, GuidesSettings } from "../entrypoints/content-ui/guides/guides-tool";
import type { createInfoController } from "../entrypoints/content-ui/info/info-tool";
import { setToolState } from "../entrypoints/content-ui/tool-state";
import { GUIDES_SETTINGS_EVENT, TOGGLE_CONSOLE_EVENT, TOGGLE_GUIDES_EVENT, TOGGLE_INFO_EVENT } from "./events";

type GuidesController = ReturnType<typeof createGuidesController>;
type InfoController = ReturnType<typeof createInfoController>;

type ContentEventDeps = {
  ensureGuidesController: () => GuidesController;
  ensureInfoController: () => InfoController;
  getGuidesController: () => GuidesController | null;
  getInfoController: () => InfoController | null;
  disableGuides: () => void;
  disableInfo: () => void;
  toggleConsolePanel: () => void;
};

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

const isEditableElement = (value: unknown): value is HTMLElement => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return typeof (value as HTMLElement).tagName === "string";
};

/** Checks if target is an editable element where keyboard shortcuts should be ignored. */
const isEditableTarget = (event: Event) => {
  const path = "composedPath" in event ? event.composedPath() : [];
  const targets = [event.target, ...path];

  for (const item of targets) {
    if (!isEditableElement(item)) {
      continue;
    }

    if (item.isContentEditable) {
      return true;
    }

    const tagName = item.tagName?.toUpperCase();
    if (tagName && EDITABLE_TAGS.has(tagName)) {
      return true;
    }

    if (item.getAttribute?.("role") === "textbox") {
      return true;
    }
  }

  return false;
};

export const createContentEventHandlers = ({
  ensureGuidesController,
  ensureInfoController,
  getGuidesController,
  getInfoController,
  disableGuides,
  disableInfo,
  toggleConsolePanel,
}: ContentEventDeps): Record<string, (event: Event) => void> => ({
  [TOGGLE_GUIDES_EVENT]: (event) => {
    const detail = event instanceof CustomEvent ? event.detail : null;
    const enabled = typeof detail?.enabled === "boolean" ? detail.enabled : undefined;

    const controller = ensureGuidesController();
    const next = controller.toggle(enabled);
    if (next) {
      disableInfo();
    }
    setToolState({
      guidesEnabled: next,
      infoEnabled: getInfoController()?.isEnabled() ?? false,
    });
  },

  [GUIDES_SETTINGS_EVENT]: (event) => {
    const detail = event instanceof CustomEvent ? event.detail : null;
    const controller = getGuidesController();
    if (!controller || !detail) {
      return;
    }

    controller.updateSettings(detail as Partial<GuidesSettings>);
  },

  [TOGGLE_INFO_EVENT]: (event) => {
    const detail = event instanceof CustomEvent ? event.detail : null;
    const enabled = typeof detail?.enabled === "boolean" ? detail.enabled : undefined;

    const controller = ensureInfoController();
    const next = controller.toggle(enabled);
    if (next) {
      disableGuides();
    }
    setToolState({
      infoEnabled: next,
      guidesEnabled: getGuidesController()?.isEnabled() ?? false,
    });
  },

  [TOGGLE_CONSOLE_EVENT]: () => {
    toggleConsolePanel();
  },

  /*
   * Keyboard Shortcuts
   *
   * i: Toggle Info mode.
   * g: Toggle Guides mode.
   * c: Toggle Console panel.
   */
  keydown: (event) => {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    if (event.repeat) {
      return;
    }

    const keyboardShortcuts: Record<string, () => void> = {
      i: () => {
        const controller = ensureInfoController();
        const next = controller.toggle();
        if (next) {
          disableGuides();
        }
        setToolState({
          infoEnabled: next,
          guidesEnabled: getGuidesController()?.isEnabled() ?? false,
        });
      },
      g: () => {
        const controller = ensureGuidesController();
        const next = controller.toggle();
        if (next) {
          disableInfo();
        }
        setToolState({
          guidesEnabled: next,
          infoEnabled: getInfoController()?.isEnabled() ?? false,
        });
      },
      c: () => {
        toggleConsolePanel();
      },
    };

    const key = event.key.toLowerCase();
    const handler = keyboardShortcuts[key];

    if (!handler) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (isEditableTarget(event)) {
      return;
    }

    event.preventDefault();
    handler();
  },
});
