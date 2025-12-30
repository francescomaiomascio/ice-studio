// runtime/AppRuntime.ts
// ============================================================================
// ICE Studio GUI — Application Runtime
// ============================================================================

import { LayoutEngine } from "../kernel/LayoutEngine.js";
import type { LayoutMode } from "../kernel/modes.js";
import { ViewRuntime } from "./ViewRuntime.js";
import { CapabilityRegistry } from "./CapabilityRegistry.js";
import type { AppMode } from "./types.js";
import { mountPreboot, unmountPreboot } from "../views/Preboot/index.js";
import { rendererLog } from "../logging/rendererLogger.js";

export class AppRuntime {
  readonly engine: LayoutEngine;
  readonly views: ViewRuntime;
  readonly capabilities: CapabilityRegistry;
  private currentMode: AppMode | null = null;
  private currentViewCleanup: (() => void) | null = null;

  constructor() {
    this.engine = new LayoutEngine();
    this.views = new ViewRuntime(this.engine);
    this.capabilities = new CapabilityRegistry();
  }

  // --------------------------------------------------------------------------
  // BOOT
  // --------------------------------------------------------------------------
  start(initialMode: AppMode = "preboot"): void {
    document.body.classList.add("bootstrap-preboot-active");
    this.engine.init(mapAppModeToLayout(initialMode));
    this.mountMode(initialMode);
    rendererLog("INFO", "AppRuntime", "started", { mode: initialMode });
  }

  stop(): void {
    if (this.currentViewCleanup) {
      this.currentViewCleanup();
      this.currentViewCleanup = null;
    }
    this.views.reset();
    this.engine.reset();
    this.currentMode = null;
    rendererLog("INFO", "AppRuntime", "stopped");
  }

  // --------------------------------------------------------------------------
  // MODE TRANSITIONS
  // --------------------------------------------------------------------------
  enter(mode: AppMode): void {
    this.mountMode(mode);
  }

  enterDashboard(): void {
    this.mountMode("dashboard");
  }

  enterWorkspace(_workspaceId: string): void {
    this.mountMode("workspace");
  }

  private mountMode(mode: AppMode): void {
    if (this.currentMode === mode) return;

    const root = this.requireRoot();

    if (this.currentViewCleanup) {
      this.currentViewCleanup();
      this.currentViewCleanup = null;
    }

    if (typeof window !== "undefined") {
      (window as any).__ICE_RUNTIME_PHASE__ = mode;
    }

    switch (mode) {
      case "preboot":
        this.engine.setMode("preboot");
        mountPreboot(root);
        this.currentViewCleanup = () => unmountPreboot(root);
        break;

      case "dashboard":
        this.engine.setMode("dashboard");
        import("../services/SystemService.js").then(({ SystemService }) => {
          SystemService.ensureReady()
            .then(() => {
              rendererLog("INFO", "Dashboard", "runtime ready");
            })
            .catch((err: unknown) => {
              console.error("System runtime failed to start", err);
            });
        });
        this.views.mountDashboard();
        this.currentViewCleanup = () => this.views.unmountCurrent();
        break;

      case "workspace":
        this.engine.setMode("workspace");
        this.views.mountWorkspace();
        this.currentViewCleanup = () => this.views.unmountCurrent();
        break;

      case "docs":
      case "plugin":
      case "settings":
        throw new Error(`[AppRuntime] Mode not yet implemented: ${mode}`);

      default:
        throw new Error(`[AppRuntime] Unsupported mode: ${mode}`);
    }

    this.currentMode = mode;
    rendererLog("INFO", "AppRuntime", "enter mode", mode);
  }

  private requireRoot(): HTMLElement {
    const root = document.getElementById("main-view");
    if (!root) {
      throw new Error("[Runtime] Missing #main-view");
    }
    return root;
  }
}

function mapAppModeToLayout(mode: AppMode): LayoutMode {
  switch (mode) {
    case "preboot":
      return "preboot";
    case "dashboard":
      return "dashboard";
    default:
      return "workspace";
  }
}
