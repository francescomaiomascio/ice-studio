// layout/regions/ExplorerRegion.ts
// ============================================================================

import { BaseRegion } from "../components/BaseRegion.js";
import { ExplorerPane } from "../components/ExplorerPane.js";

export class ExplorerRegion extends BaseRegion {
  readonly id = "explorer";
  private explorer: ExplorerPane | null = null;

  protected onMount(): void {
    const el = this.requireRoot();
    this.explorer = new ExplorerPane();
    this.explorer.mount(el);
  }

  protected onUnmount(): void {
    this.explorer?.unmount();
    this.explorer = null;
  }
}
