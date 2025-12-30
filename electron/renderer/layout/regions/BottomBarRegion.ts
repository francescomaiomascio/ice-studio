// layout/regions/BottomBarRegion.ts
// ============================================================================

import { BaseRegion } from "../components/BaseRegion.js";
import { BottomBar } from "../components/BottomBar.js";

export class BottomBarRegion extends BaseRegion {
  readonly id = "bottombar";
  private bottomBar: BottomBar | null = null;

  protected onMount(): void {
    const el = this.requireRoot();
    this.bottomBar = new BottomBar();
    this.bottomBar.mount(el);
  }

  protected onUnmount(): void {
    this.bottomBar?.unmount();
    this.bottomBar = null;
  }
}
