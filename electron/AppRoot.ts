import { mountPreboot, unmountPreboot } from "./views/Preboot";
import { mountDashboard, unmountDashboard } from "./views/Dashboard";

export type AppPhase = "preboot" | "dashboard";

class AppRoot {
  private phase: AppPhase | null = null;

  start() {
    this.enterPreboot();
  }

  async enterPreboot() {
    if (this.phase === "preboot") return;
    await this.unmountCurrent();
    mountPreboot();
    this.phase = "preboot";
  }

  async enterDashboard() {
    if (this.phase === "dashboard") return;

    await this.unmountCurrent();

    // blocco UI
    document.body.classList.add("app-loading");

    mountDashboard();

    this.phase = "dashboard";

    // segnala al main
    await (window as any).electronAPI?.runtimeEnter?.();

    document.body.classList.remove("app-loading");
  }

  private async unmountCurrent() {
    if (this.phase === "preboot") {
      await unmountPreboot();
    }
    if (this.phase === "dashboard") {
      await unmountDashboard();
    }
  }
}

export const appRoot = new AppRoot();
