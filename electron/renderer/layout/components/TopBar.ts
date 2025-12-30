// layout/components/TopBar.ts
// ============================================================================
// ICE Studio GUI — TopBar Layout Component
// ============================================================================

export class TopBar {
  private readonly root: HTMLElement;

  constructor() {
    this.root = document.createElement("div");
    this.root.classList.add("ice-topbar");
    this.root.textContent = "ICE Studio";
  }

  mount(host: HTMLElement): void {
    host.appendChild(this.root);
  }

  unmount(): void {
    this.root.remove();
  }
}
