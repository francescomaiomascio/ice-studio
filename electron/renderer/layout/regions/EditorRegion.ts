// layout/regions/EditorRegion.ts
// ============================================================================

import { BaseRegion } from "../components/BaseRegion.js";
import { EditorSurface } from "../components/EditorSurface.js";

export class EditorRegion extends BaseRegion {
  readonly id = "editor";
  private editor: EditorSurface | null = null;

  protected onMount(): void {
    const el = this.requireRoot();
    this.editor = new EditorSurface();
    this.editor.mount(el);
  }

  protected onUnmount(): void {
    this.editor?.unmount();
    this.editor = null;
  }
}
