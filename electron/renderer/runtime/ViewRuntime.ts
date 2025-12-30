// runtime/ViewRuntime.ts
// ============================================================================
// ICE Studio GUI — View Runtime
// Handles LayoutEngine-driven views (workspace, dashboard, etc.)
// ============================================================================

import type { LayoutEngine } from "../kernel/LayoutEngine.js";
import type { View } from "../kernel/LayoutEngine.js";
import { RuntimeSession } from "./RuntimeSession.js";
import { rendererLog } from "../logging/rendererLogger.js";

export class ViewRuntime {
  constructor(private readonly engine: LayoutEngine) {}

  mountWorkspace(): void {
    this.engine.loadView(WorkspaceView);
  }

  mountDashboard(): void {
    try {
      RuntimeSession.assertActive();
    } catch (err) {
      rendererLog("WARN", "ViewRuntime", "dashboard blocked", {
        error: err instanceof Error ? err.message : err,
      });
      (window as any).__ICE_APP_RUNTIME__?.enter?.("preboot");
      return;
    }
    this.engine.loadView(DashboardView);
  }

  unmountCurrent(): void {
    this.engine.loadView(EmptyView);
  }

  reset(): void {
    this.unmountCurrent();
  }
}

// --------------------------------------------------------------------------
// Placeholder views (to be replaced with real implementations)
// --------------------------------------------------------------------------
class DashboardView implements View {
  private root: HTMLElement | null = null;
  private readonly openWorkspace = () => {
    (window as any).__ICE_APP_RUNTIME__?.enterWorkspace?.("default");
  };

  mount(root: HTMLElement): void {
    this.root = root;
    root.innerHTML = `
      <section class="ice-dashboard-view">
        <h1>Dashboard</h1>
        <p>Select an action to continue.</p>
        <button id="enter-workspace">Open Workspace</button>
      </section>
    `;
    root
      .querySelector("#enter-workspace")
      ?.addEventListener("click", this.openWorkspace);
  }

  unmount(): void {
    if (this.root) {
      this.root
        .querySelector("#enter-workspace")
        ?.removeEventListener("click", this.openWorkspace);
      this.root.innerHTML = "";
    }
    this.root = null;
  }
}

class WorkspaceView implements View {
  private root: HTMLElement | null = null;

  mount(root: HTMLElement): void {
    this.root = root;
    root.innerHTML = `
      <section class="ice-workspace-view">
        <h1>Workspace</h1>
        <p>Layout engine is active. Regions will appear here.</p>
      </section>
    `;
  }

  unmount(): void {
    if (this.root) {
      this.root.innerHTML = "";
    }
    this.root = null;
  }
}

class EmptyView implements View {
  mount(root: HTMLElement): void {
    root.innerHTML = "";
  }

  unmount(): void {
    // no-op
  }
}
