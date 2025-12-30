// ============================================================================
// PrebootFlow — ICE Studio
// Domain engine (NO UI, NO WIZARD, NO PHASES)
// ============================================================================

import type {
  PrebootContext,
  RuntimeMode,
  HostInfo,
  ResourcesState,
  LocalSystemProfile,
  CanonicalLocalFacts,
  SystemCapabilities,
} from "./types.js";
import { BootstrapOpState } from "./op_states.js";
import { evaluateLocalPolicy } from "../../runtime/localPolicy.js";
import { rendererLog } from "../../logging/rendererLogger.js";
import { RuntimeSession } from "../../runtime/RuntimeSession.js";
import { appRoot } from "../../AppRoot.js";

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const globalScope: any =
  typeof window !== "undefined" ? window : {};

export const PREBOOT_BASE: string =
  globalScope.__ICE_STUDIO_PREBOOT_BASE__ || "http://127.0.0.1:7040";

const PREBOOT_URL = `${PREBOOT_BASE}/preboot`;
const HOST_URL = `${PREBOOT_BASE}/host`;
const VPN_URL = `${PREBOOT_BASE}/vpn`;

// ---------------------------------------------------------------------------
// Context factory
// ---------------------------------------------------------------------------

function createInitialContext(): PrebootContext {
  return {
    mode: null,

    perMode: {
      local: {
        systemCheck: null,
        resources: null,
        profile: null,
      },
      remote: {
        networkScope: "lan",
        discoveryMode: "auto",
        discoveredHosts: [],
        scanning: false,
        scanStartedAt: null,
        selectedHost: null,
        pairing: null,
        resources: null,
        vpnRequired: false,
        vpnStatus: "not_required",
        vpn: {
          required: false,
          connected: false,
        },
        probedHost: null,
        trustedHosts: [],
      },
      cloud: {
        provider: null,
        account: null,
        region: null,
        resources: null,
      },
    },

    preboot: null,
    network: null,

    system: {
      verified: false,
      supported: null,
      report: null,
      decision: null,
    },

    topology: {
      backend: null,
    },

    resources: {
      llm: { vram_gb: 6 },
      backend: null,
    },
  };
}

// ---------------------------------------------------------------------------
// Flow listener
// ---------------------------------------------------------------------------

export type FlowListener = (
  opState: BootstrapOpState,
  context: PrebootContext
) => void;

// ---------------------------------------------------------------------------
// Flow implementation
// ---------------------------------------------------------------------------

export class PrebootFlow {
  public opState: BootstrapOpState = BootstrapOpState.INIT;
  public context: PrebootContext;

  private listeners = new Set<FlowListener>();
  private scanInFlight = false;

  constructor() {
    this.context = createInitialContext();
    this.emit();
  }

  // -------------------------------------------------------------------------
  // Subscription
  // -------------------------------------------------------------------------

  subscribe(fn: FlowListener): () => void {
    this.listeners.add(fn);
    fn(this.opState, this.context);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) {
      fn(this.opState, this.context);
    }
  }

  private setOpState(next: BootstrapOpState): void {
    if (this.opState === next) return;
    this.opState = next;
    this.emit();
  }

  // -------------------------------------------------------------------------
  // Mode
  // -------------------------------------------------------------------------

  setMode(mode: RuntimeMode): void {
    rendererLog("INFO", "PrebootFlow", "setMode", { mode });
    this.context.mode = mode;

    if (mode === "remote") {
      this.context.topology.backend = null;
      this.context.perMode.remote.selectedHost = null;
    }

    this.emit();
  }

  // -------------------------------------------------------------------------
  // Discovery bootstrap
  // -------------------------------------------------------------------------

  async startDiscovery(): Promise<void> {
    this.setOpState(BootstrapOpState.DISCOVERY);

    try {
      const status = await fetch(`${PREBOOT_URL}/status`).then((r) =>
        r.json()
      );
      this.context.preboot = status;

      try {
        const trusted = await fetch(
          `${PREBOOT_URL}/pairing/online`
        ).then((r) => r.json());

        if (Array.isArray(trusted?.hosts)) {
          this.context.perMode.remote.trustedHosts =
            trusted.hosts.map(this.normalizeHost);
        }
      } catch {
        // soft fail
      }
    } finally {
      this.setOpState(BootstrapOpState.IDLE);
    }
  }

  // -------------------------------------------------------------------------
  // Network scan (THIS MUST WORK)
  // -------------------------------------------------------------------------

  async scanNetwork(): Promise<HostInfo[]> {
    if (this.scanInFlight) return [];

    this.scanInFlight = true;
    const remote = this.context.perMode.remote;

    remote.scanning = true;
    remote.scanStartedAt = Date.now();
    this.setOpState(BootstrapOpState.SCANNING_LAN);

    try {
      const res = await fetch(`${PREBOOT_URL}/network/scan`);
      const payload = await res.json();

      const hosts: HostInfo[] = Array.isArray(payload?.hosts)
        ? payload.hosts.map(this.normalizeHost)
        : [];

      remote.discoveredHosts = this.mergeHosts(
        remote.discoveredHosts,
        hosts
      );

      return hosts;
    } catch (err) {
      rendererLog("ERROR", "PrebootFlow", "scanNetwork failed", {
        error: err instanceof Error ? err.message : err,
      });
      return [];
    } finally {
      remote.scanning = false;
      remote.scanStartedAt = null;
      this.scanInFlight = false;
      this.setOpState(BootstrapOpState.IDLE);
      this.emit();
    }
  }

  // -------------------------------------------------------------------------
  // Host selection + probe
  // -------------------------------------------------------------------------

  setHost(host: HostInfo): void {
    this.context.perMode.remote.selectedHost = host;
    this.context.topology.backend = "lan";
    this.emit();
  }

  async probeRemoteTarget(target: string): Promise<HostInfo | null> {
    const url = new URL(`${HOST_URL}/probe`);
    url.searchParams.set("target", target);

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const payload = await res.json();
    const host = payload?.host
      ? this.normalizeHost(payload.host)
      : null;

    if (host) {
      this.updateHost(host.host_id, host);
    }

    return host;
  }

  updateHost(hostId: string, patch: Partial<HostInfo>): void {
    const remote = this.context.perMode.remote;

    const apply = (list: HostInfo[]) =>
      list.map((h) =>
        h.host_id === hostId ? { ...h, ...patch } : h
      );

    remote.trustedHosts = apply(remote.trustedHosts);
    remote.discoveredHosts = apply(remote.discoveredHosts);

    if (remote.selectedHost?.host_id === hostId) {
      remote.selectedHost = {
        ...remote.selectedHost,
        ...patch,
      };
    }

    this.emit();
  }

  // -------------------------------------------------------------------------
  // Local system verify
  // -------------------------------------------------------------------------

  async fetchSystemVerify(): Promise<unknown> {
    this.setOpState(BootstrapOpState.VERIFYING_LOCAL);

    try {
      const report = await fetch(
        `${PREBOOT_URL}/system/verify`
      ).then((r) => r.json());

      const profile = normalizeSystemProfile(report);
      console.log("LOCAL_PROFILE", profile);
      const evaluation = evaluateLocalPolicy(profile);

      this.context.perMode.local.profile = profile;
      this.context.system = {
        verified: true,
        supported: evaluation.status !== "BLOCKED",
        report,
        reasons: evaluation.reasons,
        decision: evaluation,
      };

      this.emit();
      return report;
    } finally {
      this.setOpState(BootstrapOpState.IDLE);
    }
  }

  // -------------------------------------------------------------------------
  // Topology / resources
  // -------------------------------------------------------------------------

  setExecutionBackend(backend: "client" | "lan" | "vpn"): void {
    this.context.topology.backend = backend;
    this.emit();
  }

  setResources(resources: ResourcesState): void {
    this.context.resources = {
      ...this.context.resources,
      ...resources,
    };
    this.emit();
  }

  // -------------------------------------------------------------------------
  // VPN
  // -------------------------------------------------------------------------

  async vpnAction(
    action: "connect" | "disconnect" | "status"
  ): Promise<void> {
    const method = action === "status" ? "GET" : "POST";
    const res = await fetch(`${VPN_URL}/${action}`, { method });
    const status = await res.json();

    this.context.perMode.remote.vpn = {
      ...this.context.perMode.remote.vpn,
      ...status,
    };

    this.emit();
  }

  // -------------------------------------------------------------------------
  // Launch
  // -------------------------------------------------------------------------

  async launchSnowball(): Promise<void> {
    if (!this.context.mode) return;

    this.setOpState(BootstrapOpState.APPLYING);

    try {
      let sessionInfo: any = null;
      try {
        sessionInfo = await fetch(
          `${PREBOOT_URL}/session`
        ).then((r) => r.json());
      } catch {
        sessionInfo = null;
      }

      const decideRes = await fetch(`${PREBOOT_URL}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: this.context.mode,
          topology: this.context.topology,
          host:
            this.context.mode === "remote"
              ? this.context.perMode.remote.selectedHost
              : null,
          resources: this.context.resources,
        }),
      });
      if (!decideRes.ok) {
        throw new Error(`Decide failed (${decideRes.status})`);
      }

      fetch(`${PREBOOT_URL}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: this.context.mode,
          topology: this.context.topology,
          host:
            this.context.mode === "remote"
              ? this.context.perMode.remote.selectedHost
              : null,
          resources: this.context.resources,
        }),
      }).catch(() => {
        // commit is best-effort; UI moves on immediately
      });

      RuntimeSession.start(
        this.context.mode === "remote" ? "remote" : "local",
        sessionInfo?.session_id ?? null,
        (globalScope as any)?.__ICE_RUNTIME_ID__ ?? null
      );

      this.setOpState(BootstrapOpState.READY);
      await appRoot.enterDashboard();
    } catch {
      this.setOpState(BootstrapOpState.ERROR);
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private normalizeHost = (raw: any): HostInfo => {
    const ip =
      raw.ip ||
      raw.address ||
      raw.host ||
      raw.hostname ||
      null;

    return {
      host_id: raw.host_id || raw.id || ip || crypto.randomUUID(),
      hostname: raw.hostname || "unknown",
      ip,
      online: Boolean(raw.online ?? raw.status === "online"),
      resources: raw.resources ?? null,
      latency_ms: raw.latency_ms ?? null,
      last_seen: raw.last_seen ?? null,
      status: raw.status,
    };
  };

  private mergeHosts(
    base: HostInfo[],
    incoming: HostInfo[]
  ): HostInfo[] {
    const map = new Map<string, HostInfo>();
    [...base, ...incoming].forEach((h) =>
      map.set(h.host_id, { ...map.get(h.host_id), ...h })
    );
    return Array.from(map.values());
  }
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function normalizeSystemProfile(
  raw: CanonicalLocalFacts
): LocalSystemProfile {
  const toNumber = (value: unknown): number | null => {
    if (value == null) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const platformName =
    (raw?.platform?.os || "unknown")!
      .toString()
      .toLowerCase();

  let os: LocalSystemProfile["os"] = "unknown";
  if (platformName.includes("linux")) os = "linux";
  else if (platformName.includes("darwin") || platformName.includes("mac"))
    os = "macos";
  else if (platformName.includes("win")) os = "windows";

  const archRaw =
    raw?.platform?.arch || "unknown";

  const arch =
    archRaw.toString().includes("arm") ? "arm64" :
    archRaw.toString().includes("64") ? "x86_64" :
    "unknown";

  const cpuName = null;
  const cpuLoadPct =
    toNumber(
      raw?.cpu?.load_pct
    );
  const ramUsedPct =
    toNumber(
      raw?.memory?.used_pct
    );
  const gpuLoadPct =
    toNumber(
      raw?.gpu?.load_pct
    );
  const vramFreeGB =
    toNumber(
      raw?.gpu?.vram_free_gb
    );

  return {
    os,
    arch,
    cpuName,
    cpuCores: raw?.cpu?.cores ?? null,
    cpuLoadPct,
    ramTotalGB: raw?.memory?.total_gb ?? null,
    ramFreeGB: raw?.memory?.free_gb ?? null,
    ramUsedPct,
    gpu: {
      present: raw?.gpu?.present ?? null,
      vramTotalGB: raw?.gpu?.vram_total_gb ?? null,
      vramFreeGB,
      loadPct: gpuLoadPct,
      name: raw?.gpu?.name,
    },
    backendAvailable: false,
  };
}
