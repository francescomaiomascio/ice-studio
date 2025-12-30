// kernel/LayoutEngine.ts
// ============================================================================
// ICE Studio GUI Kernel — Layout Orchestrator
// ============================================================================

import { LayoutContext } from "./LayoutContext.js";
import { RegionManager } from "./RegionManager.js";
import { PanelManager } from "./PanelManager.js";
import { LAYOUT_MODES, LayoutMode } from "./modes.js";
import { InvalidModeError } from "./errors.js";
import { rendererLog } from "../logging/rendererLogger.js";
import { RuntimeSession } from "../runtime/RuntimeSession.js";

export interface View {
  mount(root: HTMLElement): void;
  unmount?(): void;
}

export class LayoutEngine {
  private readonly context = new LayoutContext();
  private readonly regions = new RegionManager();
  private readonly panels = new PanelManager();

  private currentView: View | null = null;

  // -------------------------------------------------------------------------
  // INIT
  // -------------------------------------------------------------------------
  init(initialMode: LayoutMode = "preboot"): void {
    if (!document.body) {
      throw new Error("[LayoutEngine] document.body not ready");
    }

    this.setMode(initialMode);
    rendererLog("INFO", "LayoutEngine", "initialized", { mode: initialMode });
  }

  // -------------------------------------------------------------------------
  // MODE
  // -------------------------------------------------------------------------
  setMode(mode: LayoutMode): void {
    if (!(mode in LAYOUT_MODES)) {
      throw new InvalidModeError(mode);
    }
    if (mode === "preboot" && RuntimeSession.isActive()) {
      throw new Error("[LayoutEngine] Preboot is not allowed when runtime is active");
    }

    this.context.setMode(mode);
    document.body.dataset.layoutMode = mode;

    this.regions.enable(LAYOUT_MODES[mode]);
  }

  getMode(): LayoutMode {
    return this.context.mode;
  }

  // -------------------------------------------------------------------------
  // REGIONS / PANELS ACCESS
  // -------------------------------------------------------------------------
  getRegionManager(): RegionManager {
    return this.regions;
  }

  getPanelManager(): PanelManager {
    return this.panels;
  }

  // -------------------------------------------------------------------------
  // VIEW LIFECYCLE
  // -------------------------------------------------------------------------
  loadView(ViewClass: new () => View): void {
    const root = document.getElementById("main-view");
    if (!root) {
      throw new Error("[LayoutEngine] #main-view not found");
    }

    this.currentView?.unmount?.();
    root.innerHTML = "";

    const view = new ViewClass();
    view.mount(root);
    this.currentView = view;

    rendererLog("INFO", "LayoutEngine", "view loaded", {
      view: ViewClass.name,
    });
  }

  // -------------------------------------------------------------------------
  // RESET
  // -------------------------------------------------------------------------
  reset(): void {
    this.currentView?.unmount?.();
    this.currentView = null;
    this.panels.reset();
    this.regions.reset();
    this.context.reset();
  }
}
