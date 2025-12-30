// ============================================================================
// PrebootUIAdapter — ICE Studio
// Adapter: PrebootFlow → UI State
// NO WIZARD — NO PHASES — PURE DERIVATION
// ============================================================================

import type {
  PrebootUIState,
  RuntimeMode,
  HostInfo,
  UIGates,
  DiscoveryState,
} from "./types.js";
import { PrebootFlow } from "./PrebootFlow.js";
import { BootstrapOpState } from "./op_states.js";
import { buildLocalSummary } from "./localSummary.js";
import { rendererLog } from "../../logging/rendererLogger.js";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

function createInitialUIState(): PrebootUIState {
  return {
    mode: null,

    localSummary: null,

    discovery: {
      status: "idle",
      hosts: [],
      selectedHostId: null,
    },

    selectedHost: null,

    topology: {
      backend: null,
    },

    resources: {
      llm: { vram_gb: 6 },
      backend: null,
    },

    ui: {
      modals: {
        pairingModal: {
          open: false,
          host: null,
          status: "idle",
          message: null,
        },
      },
    },

    loading: false,
    error: null,

    gates: {
      canConfigureExecution: false,
      canLaunch: false,
    },
  };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class PrebootUIAdapter {
  private static nextId = 1;
  private flow: PrebootFlow;
  private listeners = new Set<(state: PrebootUIState) => void>();
  private instanceId: number;

  private uiState: PrebootUIState = createInitialUIState();
  private lastSnapshot: string | null = null;
  private lastLogSnapshot: string | null = null;

  constructor(flow: PrebootFlow) {
    this.flow = flow;
    this.instanceId = PrebootUIAdapter.nextId++;

    this.flow.subscribe((opState, ctx) => {
      this.recompute(opState, ctx);
    });
  }

  // -------------------------------------------------------------------------
  // Subscription
  // -------------------------------------------------------------------------

  subscribe(fn: (state: PrebootUIState) => void): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const fn of this.listeners) fn(snap);
    const stack = new Error().stack || "";
    rendererLog("TRACE", "PrebootUIAdapter", "emit", {
      instanceId: this.instanceId,
      stack: stack.split("\n").slice(1, 6).map((line) => line.trim()),
    });
  }

  private snapshot(): PrebootUIState {
    return JSON.parse(JSON.stringify(this.uiState));
  }

  // -------------------------------------------------------------------------
  // Core recompute
  // -------------------------------------------------------------------------

  private recompute(
    opState: BootstrapOpState,
    ctx: PrebootFlow["context"]
  ): void {
    const next = createInitialUIState();

    // ---------------------------------------------------------------------
    // Mode
    // ---------------------------------------------------------------------

    next.mode = ctx.mode;

    // ---------------------------------------------------------------------
    // Local
    // ---------------------------------------------------------------------

    if (ctx.mode === "local") {
      if (ctx.perMode.local.profile && ctx.system.decision) {
        next.localSummary = buildLocalSummary(
          ctx.perMode.local.profile,
          ctx.system.decision
        );
      }
    }

    // ---------------------------------------------------------------------
    // Discovery / Remote
    // ---------------------------------------------------------------------

    if (ctx.mode === "remote") {
      const remote = ctx.perMode.remote;

      next.discovery.status = remote.scanning
        ? "scanning"
        : "idle";

      // merge trusted + discovered
      const merged = new Map<string, HostInfo>();

      remote.trustedHosts.forEach((h) =>
        merged.set(h.host_id, h)
      );
      remote.discoveredHosts.forEach((h) =>
        merged.set(h.host_id, {
          ...merged.get(h.host_id),
          ...h,
        })
      );

      const hosts = Array.from(merged.values()).map((host) =>
        this.applyHostStatus(host)
      );

      next.discovery.hosts = hosts;

      if (remote.selectedHost) {
        next.selectedHost =
          hosts.find(
            (h) => h.host_id === remote.selectedHost?.host_id
          ) ?? this.applyHostStatus(remote.selectedHost);
      } else {
        next.selectedHost = null;
      }
      next.discovery.selectedHostId =
        remote.selectedHost?.host_id ?? null;
    }

    // ---------------------------------------------------------------------
    // Topology / resources
    // ---------------------------------------------------------------------

    next.topology = { ...ctx.topology };
    next.resources = { ...ctx.resources };

    // ---------------------------------------------------------------------
    // Loading
    // ---------------------------------------------------------------------

    next.loading =
      opState === BootstrapOpState.DISCOVERY ||
      opState === BootstrapOpState.SCANNING_LAN ||
      opState === BootstrapOpState.VERIFYING_LOCAL ||
      opState === BootstrapOpState.APPLYING;

    // ---------------------------------------------------------------------
    // Gates (THIS IS THE TRUTH)
    // ---------------------------------------------------------------------

    next.gates = this.computeGates(next);

    const serialized = JSON.stringify(next);
    if (this.lastSnapshot === serialized) return;
    this.lastSnapshot = serialized;

    this.uiState = next;
    this.emit();

    const logPayload = {
      mode: next.mode,
      hosts: next.discovery.hosts.length,
      gates: next.gates,
    };
    const logSnapshot = JSON.stringify(logPayload);
    if (this.lastLogSnapshot !== logSnapshot) {
      this.lastLogSnapshot = logSnapshot;
      rendererLog("TRACE", "PrebootUIAdapter", "ui recomputed", logPayload);
    }
  }

  // -------------------------------------------------------------------------
  // Gates logic
  // -------------------------------------------------------------------------

  private computeGates(state: PrebootUIState): UIGates {
    // local
    if (state.mode === "local") {
      return {
        canConfigureExecution: false,
        canLaunch: state.localSummary
          ? state.localSummary.status !== "BLOCKED"
          : false,
      };
    }

    // remote
    if (state.mode === "remote") {
      const hostReady =
        state.selectedHost?.online === true &&
        state.selectedHost?.resources?.available === true;

      return {
        canConfigureExecution: hostReady,
        canLaunch: hostReady,
      };
    }

    return {
      canConfigureExecution: false,
      canLaunch: false,
    };
  }

  private applyHostStatus(host: HostInfo): HostInfo {
    const paired = this.isHostPaired(host);

    if (!paired) {
      return {
        ...host,
        status: host.status === "pairing" ? "pairing" : "available",
      };
    }

    if (host.online === false) {
      return { ...host, status: "offline" };
    }

    return { ...host, status: "paired" };
  }

  private isHostPaired(host: HostInfo): boolean {
    if (host.status === "paired") return true;
    const pairing = (host as HostInfo & {
      pairing?: { paired?: boolean };
    }).pairing;
    return pairing?.paired === true;
  }

  // -------------------------------------------------------------------------
  // UI → Flow actions
  // -------------------------------------------------------------------------

  selectMode(mode: RuntimeMode): void {
    this.flow.setMode(mode);
  }

  refreshScan(): Promise<void> {
    return this.flow.scanNetwork().then(() => {});
  }

  selectHost(host: HostInfo): void {
    this.flow.setHost(host);

    const target = host.ip || host.host_id;
    if (!target) return;

    this.flow
      .probeRemoteTarget(target)
      .then((probe) => {
        if (!probe) {
          this.flow.updateHost(host.host_id, {
            online: false,
            resources: { available: false },
          });
        }
      })
      .catch(() => {
        this.flow.updateHost(host.host_id, {
          online: false,
          resources: { available: false },
        });
      });
  }

  setExecutionBackend(backend: "lan" | "vpn" | "client"): void {
    this.flow.setExecutionBackend(backend);
  }

  setResources(resources: PrebootUIState["resources"]): void {
    this.flow.setResources(resources);
  }

  fetchSystemVerify(): Promise<unknown> {
    return this.flow.fetchSystemVerify();
  }

  vpnAction(
    action: "connect" | "disconnect" | "status"
  ): Promise<void> {
    return this.flow.vpnAction(action);
  }

  confirmPreboot(): Promise<void> {
    if (!this.uiState.gates.canLaunch) {
      rendererLog(
        "WARN",
        "PrebootUIAdapter",
        "launch blocked by gates"
      );
      return Promise.resolve();
    }
    return this.flow.launchSnowball();
  }
}
