// layout/components/EditorSurface.ts
// ============================================================================

export class EditorSurface {
  private readonly root: HTMLElement;

  constructor() {
    this.root = document.createElement("div");
    this.root.classList.add("ice-editor");
    this.root.textContent = "Editor";
  }

  mount(host: HTMLElement): void {
    host.appendChild(this.root);
  }

  unmount(): void {
    this.root.remove();
  }
}
