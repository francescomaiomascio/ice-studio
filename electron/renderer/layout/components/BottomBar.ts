// layout/components/BottomBar.ts
// ============================================================================

export class BottomBar {
  private readonly root: HTMLElement;

  constructor() {
    this.root = document.createElement("div");
    this.root.classList.add("ice-bottombar");
    this.root.textContent = "Bottom Bar";
  }

  mount(host: HTMLElement): void {
    host.appendChild(this.root);
  }

  unmount(): void {
    this.root.remove();
  }
}
