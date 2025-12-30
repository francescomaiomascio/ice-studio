// layout/components/TerminalPanel.ts
// ============================================================================

export class TerminalPanel {
  private readonly root: HTMLElement;

  constructor() {
    this.root = document.createElement("div");
    this.root.classList.add("ice-terminal");
    this.root.textContent = "Terminal";
  }

  mount(host: HTMLElement): void {
    host.appendChild(this.root);
  }

  unmount(): void {
    this.root.remove();
  }
}
