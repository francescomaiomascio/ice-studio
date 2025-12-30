import { mountPreboot, unmountPreboot } from "./views/Preboot/index.js";
import { mountDashboard, unmountDashboard } from "./views/Dashboard/index.js";

export type AppPhase = "preboot" | "dashboard";

class AppRoot {
  private phase: AppPhase | null = null;

  start() {
    this.enterPreboot();
  }

  async enterPreboot() {
    if (this.phase === "preboot") return;
    const root = this.getRoot();
    await this.unmountCurrent(root);
    mountPreboot(root);
    this.phase = "preboot";
  }

  async enterDashboard() {
    if (this.phase === "dashboard") return;

    const root = this.getRoot();
    await this.unmountCurrent(root);

    mountDashboard(root);

    this.phase = "dashboard";

    // segnala al main
    await (window as any).electronAPI?.runtimeEnter?.();
  }

  private async unmountCurrent(root: HTMLElement) {
    if (this.phase === "preboot") {
      await unmountPreboot(root);
    }
    if (this.phase === "dashboard") {
      await unmountDashboard(root);
    }
  }

  private getRoot(): HTMLElement {
    const root = document.getElementById("main-view");
    if (!root) throw new Error("App root missing");
    return root;
  }
}

export const appRoot = new AppRoot();
