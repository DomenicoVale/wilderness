import {
  createGuidesController,
  type GuidesSettings,
} from "../entrypoints/content-ui/guides/guides-tool";
import { createInfoController } from "../entrypoints/content-ui/info/info-tool";
import { setToolState } from "../entrypoints/content-ui/tool-state";
import {
  GUIDES_SETTINGS_EVENT,
  TOGGLE_GUIDES_EVENT,
  TOGGLE_INFO_EVENT,
} from "./events";

type GuidesController = ReturnType<typeof createGuidesController>;
type InfoController = ReturnType<typeof createInfoController>;

type ContentEventDeps = {
  ensureGuidesController: () => GuidesController;
  ensureInfoController: () => InfoController;
  getGuidesController: () => GuidesController | null;
  getInfoController: () => InfoController | null;
  disableGuides: () => void;
  disableInfo: () => void;
};

/** Checks if target is an editable element where keyboard shortcuts should be ignored. */
const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};

export const createContentEventHandlers = ({
  ensureGuidesController,
  ensureInfoController,
  getGuidesController,
  getInfoController,
  disableGuides,
  disableInfo,
}: ContentEventDeps): Record<string, (event: Event) => void> => ({
  [TOGGLE_GUIDES_EVENT]: (event) => {
    const detail = event instanceof CustomEvent ? event.detail : null;
    const enabled =
      typeof detail?.enabled === "boolean" ? detail.enabled : undefined;

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
    const enabled =
      typeof detail?.enabled === "boolean" ? detail.enabled : undefined;

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

  /*
   * Keyboard Shortcuts
   *
   * i: Toggle Info mode.
   * g: Toggle Guides mode.
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
    };

    const key = event.key.toLowerCase();
    const handler = keyboardShortcuts[key];

    if (!handler) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (isEditableTarget(event.target)) {
      return;
    }

    event.preventDefault();
    handler();
  },
});
