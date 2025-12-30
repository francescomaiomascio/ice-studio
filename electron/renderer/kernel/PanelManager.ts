// kernel/PanelManager.ts
// ============================================================================
// Registry and lifecycle of panels (tools, editors, plugins)
// ============================================================================

import { PanelNotFoundError } from "./errors.js";

export interface Panel {
  id: string;
  open(props?: unknown): void;
  close?(): void;
}

export class PanelManager {
  private panels = new Map<string, Panel>();

  register(panel: Panel): void {
    if (!panel?.id) {
      throw new Error("[PanelManager] Panel must have an id");
    }
    this.panels.set(panel.id, panel);
  }

  get(panelId: string): Panel {
    const panel = this.panels.get(panelId);
    if (!panel) {
      throw new PanelNotFoundError(panelId);
    }
    return panel;
  }

  open(panelId: string, props?: unknown): void {
    this.get(panelId).open(props);
  }

  close(panelId: string): void {
    const panel = this.panels.get(panelId);
    panel?.close?.();
  }

  reset(): void {
    for (const panel of this.panels.values()) {
      panel.close?.();
    }
  }
}
