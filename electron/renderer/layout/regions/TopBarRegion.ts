// layout/regions/TopBarRegion.ts

import { BaseRegion } from "../components/BaseRegion.js";
import { TopBar } from "../components/TopBar.js";

export class TopBarRegion extends BaseRegion {
  readonly id = "topbar";

  private topBar?: TopBar;

  protected onMount(): void {
    const el = this.requireRoot();
    this.topBar = new TopBar();
    this.topBar.mount(el);
  }

  protected onUnmount(): void {
    this.topBar?.unmount();
    this.topBar = undefined;
  }
}
