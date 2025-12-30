// layout/regions/TerminalRegion.ts
// ============================================================================

import { BaseRegion } from "../components/BaseRegion.js";
import { TerminalPanel } from "../components/TerminalPanel.js";

export class TerminalRegion extends BaseRegion {
  readonly id = "terminal";
  private terminal: TerminalPanel | null = null;

  protected onMount(): void {
    const el = this.requireRoot();
    this.terminal = new TerminalPanel();
    this.terminal.mount(el);
  }

  protected onUnmount(): void {
    this.terminal?.unmount();
    this.terminal = null;
  }
}
