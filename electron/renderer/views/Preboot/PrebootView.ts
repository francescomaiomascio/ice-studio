// ============================================================================
// BootstrapView — ICE Studio
// PREBOOT VIEW (DOM-only, Mode-aware, Logic-free)
// ============================================================================

import { PrebootUIAdapter } from "./PrebootUIAdapter.js";
import type { PrebootUIState, HostInfo, LocalSummary } from "./types.js";
import { PrebootLayout } from "./PrebootLayout.js";
import { rendererLog } from "../../logging/rendererLogger.js";
import { PrebootFlow } from "./PrebootFlow.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BootstrapRuntime {
  adapter: PrebootUIAdapter;
}

type WindowControlAction = "minimize" | "maximize" | "close";
// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export class BootstrapView {
  private root: HTMLElement | null = null;
  private adapter: PrebootUIAdapter;
  private currentState: PrebootUIState | null = null;
  private scanTicker: number | null = null;
  private unsubscribe: (() => void) | null = null;
  private readyNotified = false;
  private localVerifyInFlight = false;
  private runtimeLocked = false;

  constructor(runtime: BootstrapRuntime) {
    this.adapter = runtime.adapter;
  }

  mount(root: HTMLElement): void {
    if (this.root === root) return;
    this.root = root;

    this.unsubscribe = this.adapter.subscribe((state) => {
      this.currentState = state;
      this.render();
    });
  }

  unmount(): void {
    this.clearScanTicker();
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.root) {
      this.root.innerHTML = "";
    }
    this.root = null;
    this.currentState = null;
    this.runtimeLocked = false;
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private render(): void {
    if (!this.currentState || !this.root) return;

    const state = this.currentState;
    if (state.mode === "local") {
      this.maybeVerifyLocalSystem(state);
    }
    const layout = PrebootLayout({
      main: this.renderMainColumn(state),
      sidebar: this.renderSidebar(state),
    });

    this.root.innerHTML = `
      ${this.renderWindowControls()}
      ${layout}
    `;
    this.notifyRuntimeReady();

    this.bindEvents();
    this.manageScanTicker(state);
  }

  private maybeVerifyLocalSystem(state: PrebootUIState): void {
    if (state.mode !== "local") return;
    if (state.localSummary) return;
    if (state.loading || this.localVerifyInFlight) return;

    this.localVerifyInFlight = true;
    this.adapter
      .fetchSystemVerify()
      .catch((err: unknown) => {
        rendererLog(
          "WARN",
          "BootstrapView",
          "local system verify failed",
          err
        );
      })
      .finally(() => {
        this.localVerifyInFlight = false;
      });
  }

  // -------------------------------------------------------------------------
  // Sections
  // -------------------------------------------------------------------------

  private renderMainColumn(state: PrebootUIState): string {
    const sections: string[] = [
      this.renderHero(),
      this.renderTopologySection(state),
    ];

    if (state.mode === "local") {
      sections.push(this.renderLocalStatusSection(state));
      return sections.join("");
    } else if (state.mode === "remote") {
      sections.push(this.renderFlakesSection(state));
      if (this.canConfigureExecution(state)) {
        sections.push(this.renderExecutionModelSection(state));
      }
    }

    return sections.filter(Boolean).join("");
  }

  private renderSidebar(state: PrebootUIState): string {
    return `
      ${this.renderStatusPanel(state)}
      ${this.renderLaunchButton(state)}
    `;
  }

  private renderHero(): string {
    return `
      <section class="preboot-hero preboot-hero--fixed">
        <h1 class="preboot-brand">ICE STUDIO</h1>
        <p class="preboot-tagline">
          Integrated Cognitive Environment Studio
        </p>
      </section>
    `;
  }

  private notifyRuntimeReady(): void {
    if (this.readyNotified) return;
    try {
      (window as any)?.electronAPI?.prebootReady?.();
      this.readyNotified = true;
    } catch (err) {
      rendererLog("WARN", "BootstrapView", "Failed to notify runtime ready", {
        error: err instanceof Error ? err.message : err,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Section renderers
  // -------------------------------------------------------------------------

  private renderTopologySection(state: PrebootUIState): string {
    const mode = state.mode;
    const lockUi = this.runtimeLocked;
    const modes: Array<{ id: PrebootUIState["mode"]; label: string; disabled?: boolean }> = [
      { id: "local", label: "Local" },
      { id: "remote", label: "Remote" },
      { id: "cloud", label: "Cloud", disabled: true },
    ];

    return `
      <section class="preboot-section preboot-section--topology">
        <header class="preboot-section-header">
          <div>
            <p class="preboot-eyebrow">Topology</p>
            <h2>Select Your Topology</h2>
            <p>Choose where ICE workloads will run.</p>
          </div>
        </header>
        <div class="preboot-section-body">
          <div class="bootstrap-actions">
            ${modes
              .map(({ id, label, disabled }) => {
                const isActive = mode === id;
                const attrs = [
                  `class="bootstrap-mode-btn${isActive ? " active" : ""}"`,
                  `data-mode="${id}"`,
                  disabled || lockUi
                    ? 'disabled title="Cloud mode will return soon"'
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return `
                  <button ${attrs}>${label.toUpperCase()}</button>
                `;
              })
              .join("")}
          </div>
        </div>
      </section>
    `;
  }

  private renderLocalStatusSection(state: PrebootUIState): string {
    if (!state.localSummary) {
      return `
      <section class="preboot-section">
        <header class="preboot-section-header">
          <p class="preboot-eyebrow">Local setup</p>
          <h2>Preparing local runtime</h2>
        </header>
        <div class="preboot-section-body">
          <p>Verifying system capabilities…</p>
        </div>
      </section>
      `;
    }

    return this.renderLocalRuntimeCard(state.localSummary);
  }

  private renderLocalRuntimeCard(summary: LocalSummary): string {
    const statusClass = summary.status.toLowerCase();
    const details =
      summary.details && summary.details.length > 0
        ? summary.details
        : [
            { label: "Platform", value: summary.platform },
            { label: "Compute", value: summary.compute },
            { label: "Memory", value: summary.memory },
          ];
    return `
      <section class="preboot-section">
        <header class="preboot-section-header">
          <p class="preboot-eyebrow">Local setup</p>
          <h2>Local runtime</h2>
          <span class="badge badge--${statusClass}">${summary.status}</span>
        </header>
        <div class="preboot-section-body">
          <ul class="preboot-runtime-details">
            ${details
              .map(
                (item) => `
              <li>
                <span class="preboot-runtime-label">${item.label}</span>
                <span class="preboot-runtime-value">${item.value}</span>
              </li>
            `
              )
              .join("")}
          </ul>
          <p class="preboot-verdict preboot-verdict--${statusClass}">
            ${summary.verdict}
          </p>
        </div>
      </section>
    `;
  }

  private renderFlakesSection(state: PrebootUIState): string {
    return `
      <section class="preboot-section preboot-section--flakes">
        <header class="preboot-section-header">
          <div>
            <p class="preboot-eyebrow">Flakes</p>
            <h2>Select a flake</h2>
            <p>Use a paired flake or discover a new one on your network.</p>
          </div>
        </header>
        <div class="preboot-section-body">
          ${this.renderDiscoverFlakes(state)}
          ${this.renderPairedFlakes(state)}
        </div>
      </section>
    `;
  }

  private renderPairedFlakes(state: PrebootUIState): string {
    const paired = state.discovery.hosts.filter(
      (h) => h.status === "paired"
    );

    return `
      <div class="flakes-group flakes-group--paired">
        <h3 class="flakes-group-title">Paired flakes</h3>
        ${
          paired.length === 0
            ? `
              <p class="preboot-flake-empty">
                No paired flakes yet.<br />
                Pair a flake from the Discover section below.
              </p>
            `
            : `
              <div class="flake-list">
                ${paired
                  .map((host) => this.renderFlakeItem(host, state))
                  .join("")}
              </div>
            `
        }
      </div>
    `;
  }

  private renderDiscoverFlakes(state: PrebootUIState): string {
    const scanning = state.discovery.status === "scanning";
    const discovered = state.discovery.hosts.filter(
      (h) => h.status !== "paired"
    );

    return `
      <div class="flakes-group flakes-group--discover">
        <div class="flakes-group-header flakes-group-header--row">
          <h3 class="flakes-group-title">Discover flakes</h3>
          <button
            id="flake-scan-btn"
            class="preboot-scan-btn"
            ${scanning ? "disabled" : ""}>
            ${scanning ? "Scanning…" : "Scan"}
          </button>
        </div>
        ${
          scanning
            ? `<p class="preboot-flake-empty">Scanning local network…</p>`
            : discovered.length === 0
            ? `
              <p class="preboot-flake-empty">
                No flakes available on LAN.<br />
                Make sure the ICE daemon is running on a reachable machine.
              </p>
            `
            : `
              <div class="flake-list">
                ${discovered
                  .map((host) => this.renderFlakeItem(host, state))
                  .join("")}
              </div>
            `
        }
      </div>
    `;
  }

  private renderFlakeItem(host: HostInfo, state: PrebootUIState): string {
    const online = host.online === true;
    const iced = host.resources?.available === true;
    const selected = state.selectedHost?.host_id === host.host_id;

    return `
      <button
        class="flake-item${selected ? " selected" : ""}"
        data-host-id="${host.host_id}"
        ${!online ? 'title="Host offline"' : ""}>
        <div class="flake-item__left">
          <strong>${host.hostname || host.host_id}</strong>
          <small>${host.ip || ""}</small>
        </div>
        <div class="flake-item__right">
          <span class="badge ${online ? "badge--green" : "badge--red"}">
            ${online ? "ONLINE" : "OFFLINE"}
          </span>
          ${
            online
              ? `<span class="badge ${
                  iced ? "badge--ice" : "badge--warn"
                }">${iced ? "ICED" : "CHECKING"}</span>`
              : ""
          }
        </div>
      </button>
    `;
  }

  private renderExecutionModelSection(state: PrebootUIState): string {
    const host = state.selectedHost;
    if (!host) return "";
    const selectedMode = state.topology.backend === "vpn" ? "vpn" : "lan";

    return `
      <section class="preboot-section preboot-section--execution">
        <header class="preboot-section-header">
          <div>
            <p class="preboot-eyebrow">Execution</p>
            <h2>Execution model</h2>
            <p>Select how this flake will be used.</p>
          </div>
        </header>
        <div class="preboot-section-body preboot-execution-body">
          <div class="preboot-selected-host">
            <strong>${host.hostname || host.host_id}</strong>
            <small>${host.ip || "Unknown address"}</small>
          </div>
          <div class="preboot-execution-toggle">
            <label>
              <input type="radio" name="net" value="lan" ${
                selectedMode === "lan" ? "checked" : ""
              } />
              LAN
            </label>
            <label>
              <input type="radio" name="net" value="vpn" ${
                selectedMode === "vpn" ? "checked" : ""
              } />
              VPN
            </label>
          </div>
        </div>
      </section>
    `;
  }

  private canConfigureExecution(state: PrebootUIState): boolean {
    return this.isHostReady(state.selectedHost);
  }

  private isHostReady(host?: HostInfo | null): boolean {
    return Boolean(host && host.online && host.resources?.available);
  }

  private renderStatusPanel(state: PrebootUIState): string {
    if (state.mode === "remote") {
      return `
        <section class="preboot-side-card">
          ${
            state.selectedHost
              ? `<p>Flake selected:<br><strong>${state.selectedHost.hostname ?? state.selectedHost.host_id}</strong></p>`
              : `<p>No flake selected.</p>`
          }
        </section>
      `;
    }

    if (state.mode === "local") {
      return `
        <section class="preboot-side-card">
          <p>Local runtime ${state.localSummary ? "ready" : "preparing"}.</p>
        </section>
      `;
    }

    return `
      <section class="preboot-side-card">
        <p>Select a topology to begin.</p>
      </section>
    `;
  }

  private renderLaunchButton(state: PrebootUIState): string {
    const text =
      state.mode === "remote"
        ? "Launch Snowball"
        : "Launch ICE Studio";
    const disabled =
      state.gates.canLaunch && !this.runtimeLocked ? "" : "disabled";
    const isLocalReady =
      state.mode === "local" && state.gates.canLaunch;
    const className = `preboot-launch-btn${
      isLocalReady ? " preboot-launch-btn--local-ready" : ""
    }`;

    return `
      <section class="preboot-side-card">
        <button class="${className}" ${disabled}>
          ${text}
        </button>
      </section>
    `;
  }

  // -------------------------------------------------------------------------
  // Window controls
  // -------------------------------------------------------------------------

  private renderWindowControls(): string {
    if (this.isMacOS()) {
      return "";
    }

    return `
      <div class="bootstrap-window-controls">
        ${(["minimize", "maximize", "close"] as WindowControlAction[])
          .map(
            (a) => `
          <button data-window-control="${a}" aria-label="${a}">
            ${a}
          </button>
        `
          )
          .join("")}
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  private bindEvents(): void {
    const state = this.currentState;
    if (!this.root || !state) return;
    if (this.runtimeLocked) return;

    const root = this.root;

    // Runtime mode
    root.querySelectorAll("[data-mode]").forEach((el) => {
      el.addEventListener("click", () => {
        const mode = (el as HTMLElement).dataset.mode;
        rendererLog("INFO", "BootstrapView", "mode clicked", { mode });
        if (mode) this.adapter.selectMode(mode as any);
      });
    });

    if (state.mode === "remote") {
      const scanBtn = root.querySelector(
        "#flake-scan-btn"
      ) as HTMLButtonElement | null;
      if (scanBtn) {
        scanBtn.disabled = state.discovery.status === "scanning";
        scanBtn.addEventListener("click", () => {
          this.adapter.refreshScan().catch((err: unknown) => {
            rendererLog("WARN", "BootstrapView", "scan refresh failed", {
              error: err instanceof Error ? err.message : err,
            });
          });
        });
      }

      root.querySelectorAll("[data-host-id]").forEach((el) => {
        el.addEventListener("click", () => {
          const id = (el as HTMLElement).dataset.hostId;
          const host = state.discovery.hosts.find(
            (h: HostInfo) => h.host_id === id
          );
          if (!host) return;
          if (!host.online) {
            window.alert?.("Host offline. Start the daemon on the flake.");
            return;
          }
          this.adapter.selectHost(host);
        });
      });

      root.querySelectorAll('input[name="net"]').forEach((el) => {
        el.addEventListener("change", () => {
          const value = (el as HTMLInputElement).value;
          this.adapter.setExecutionBackend(
            value === "vpn" ? "vpn" : "lan"
          );
        });
      });
    }

    // Launch
    const launchBtn = root.querySelector(
      ".preboot-launch-btn"
    ) as HTMLButtonElement | null;
    if (launchBtn) {
      launchBtn.disabled = !state.gates.canLaunch;
      launchBtn.textContent =
        state.mode === "remote"
          ? "Launch Snowball"
          : "Launch ICE Studio";
      launchBtn.addEventListener("click", () => {
        const current = this.currentState;
        if (!current || launchBtn.disabled) return;
        if (!current.gates.canLaunch) return;
        this.runtimeLocked = true;
        this.render();
        this.adapter
          .confirmPreboot()
          .catch(() => {
            this.runtimeLocked = false;
            this.render();
          });
      });
    }
  }

  // -------------------------------------------------------------------------
  // Scan ticker
  // -------------------------------------------------------------------------

  private manageScanTicker(state: PrebootUIState): void {
    if (state.discovery.status === "scanning") {
      if (this.scanTicker == null) {
        this.scanTicker = window.setInterval(() => {
          this.render();
        }, 1000);
      }
      return;
    }
    this.clearScanTicker();
  }

  private clearScanTicker(): void {
    if (this.scanTicker != null) {
      clearInterval(this.scanTicker);
      this.scanTicker = null;
    }
  }

  private async waitForBackendReady(
    retries = 60,
    delayMs = 500
  ): Promise<boolean> {
    const statusFn = (window as any)?.ICE_SYSTEM?.status;
    if (typeof statusFn !== "function") {
      return false;
    }
    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        const status = await statusFn();
        if (status?.started) {
          return true;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return false;
  }

  private async startSystemRuntime(): Promise<void> {
    const startFn = (window as any)?.ICE_SYSTEM?.start;
    if (typeof startFn !== "function") {
      throw new Error("ICE_SYSTEM.start not available");
    }
    await startFn();
  }

  private async waitForSystemStarted(
    retries = 60,
    delayMs = 500
  ): Promise<boolean> {
    const statusFn = (window as any)?.ICE_SYSTEM?.status;
    if (typeof statusFn !== "function") {
      return false;
    }
    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        const status = await statusFn();
        if (status?.started) {
          return true;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return false;
  }

  private isMacOS(): boolean {
    return (
      typeof window !== "undefined" &&
      (window as any).__ICE_PLATFORM__?.platform === "darwin"
    );
  }
}

export interface PrebootMountOptions {
  root: HTMLElement;
}

export function mountPrebootView(
  options: PrebootMountOptions
): { destroy(): void } {
  const { root } = options;

  if (!root) {
    throw new Error("[Preboot] Missing root element");
  }

  const flow = new PrebootFlow();
  const adapter = new PrebootUIAdapter(flow);

  const view = new BootstrapView({ adapter });
  view.mount(root);

  flow.startDiscovery().catch((err: unknown) => {
    rendererLog("ERROR", "PrebootView", "discovery failed", {
      error: err instanceof Error ? err.message : err,
    });
  });

  return {
    destroy() {
      view.unmount();
    },
  };
}
