// ============================================================================
// Preboot Types — ICE Studio
// SINGLE SOURCE OF TRUTH (NO WIZARD, NO PHASE)
// ============================================================================

// -----------------------------------------------------------------------------
// Runtime modes
// -----------------------------------------------------------------------------

export type RuntimeMode = "local" | "remote" | "cloud";

// -----------------------------------------------------------------------------
// Network / discovery
// -----------------------------------------------------------------------------

export type NetworkScope = "lan" | "vpn";

export type DiscoveryStatus = "idle" | "scanning";

// -----------------------------------------------------------------------------
// Host / Flake
// -----------------------------------------------------------------------------

export interface HostResourcesInfo {
  available?: boolean;
  ram_free_gb?: number | null;
  vram_free_gb?: number | null;
}

export interface HostInfo {
  host_id: string;
  hostname?: string;
  ip?: string;

  online?: boolean;
  resources?: HostResourcesInfo | null;
  status?: string;

  latency_ms?: number | null;
  last_seen?: number | string | null;
}

// -----------------------------------------------------------------------------
// Local system summary (UI-facing)
// -----------------------------------------------------------------------------

export interface LocalSummary {
  status: "APPROVED" | "LIMITED" | "BLOCKED";
  platform: string;
  compute: string;
  memory: string | null;
  verdict: string;
  reasons: string[];
  notes: string[];
  details?: Array<{
    label: string;
    value: string;
  }>;
}

// -----------------------------------------------------------------------------
// Topology / execution
// -----------------------------------------------------------------------------

export type ExecutionBackend = "client" | "lan" | "vpn";

export interface TopologyState {
  backend: ExecutionBackend | null;
}

// -----------------------------------------------------------------------------
// Resources
// -----------------------------------------------------------------------------

export interface ResourcesState {
  llm: {
    vram_gb: number;
  };
  backend?: Record<string, unknown> | null;
}

// -----------------------------------------------------------------------------
// Discovery UI state
// -----------------------------------------------------------------------------

export interface DiscoveryState {
  status: DiscoveryStatus;
  hosts: HostInfo[];
  selectedHostId: string | null;
}

// -----------------------------------------------------------------------------
// UI modals
// -----------------------------------------------------------------------------

export type PairingModalStatus = "idle" | "pending" | "error";

export interface PairingModalState {
  open: boolean;
  host: HostInfo | null;
  status: PairingModalStatus;
  message: string | null;
}

export interface ViewUIState {
  modals: {
    pairingModal: PairingModalState;
  };
}

// -----------------------------------------------------------------------------
// Gates (computed, read-only, UI-only)
// -----------------------------------------------------------------------------

export interface UIGates {
  canConfigureExecution: boolean;
  canLaunch: boolean;
}

// -----------------------------------------------------------------------------
// Root UI state (USED BY VIEW ONLY)
// -----------------------------------------------------------------------------

export interface PrebootUIState {
  mode: RuntimeMode | null;

  // local
  localSummary: LocalSummary | null;

  // remote
  discovery: DiscoveryState;
  selectedHost: HostInfo | null;
  topology: TopologyState;
  resources: ResourcesState;

  // ui
  ui: ViewUIState;
  loading: boolean;
  error: string | null;

  // gates
  gates: UIGates;
}

// ============================================================================
// Domain-level context (USED BY FLOW ONLY)
// ============================================================================

export interface PlatformCapabilities {
  os?: string;
  arch?: string | null;
  version?: string | null;
}

export interface RamCapabilities {
  total_gb?: number | null;
  available_gb?: number | null;
}

export interface GpuCapabilities {
  type?: string | null;
  vram_gb?: number | null;
  compute?: string | null;
}

export interface RuntimeCapabilities {
  containers?: boolean | null;
  native?: boolean | null;
  cpuFallback?: boolean | null;
}

export interface SystemCapabilities {
  platform: PlatformCapabilities;
  cpu?: Record<string, unknown> | null;
  ram: RamCapabilities;
  gpu?: GpuCapabilities | null;
  runtime: RuntimeCapabilities;
  cpuFallback?: boolean | null;
}

export interface LocalSystemProfile {
  os: "linux" | "macos" | "windows" | "unknown";
  arch: "x86_64" | "arm64" | "unknown";
  cpuName?: string | null;
  ramTotalGB: number | null;
  ramFreeGB: number | null;
  cpuCores: number | null;
  cpuLoadPct?: number | null;
  ramUsedPct?: number | null;
  gpu: {
    present: boolean | null;
    vramTotalGB: number | null;
    vramFreeGB?: number | null;
    loadPct?: number | null;
    name?: string;
  };
  backendAvailable: boolean;
}

export interface CanonicalLocalFacts {
  platform: {
    os: "linux" | "darwin" | "windows";
    arch: "x86_64" | "arm64";
  };
  cpu: {
    cores: number;
    load_pct?: number | null;
  };
  memory: {
    total_gb: number | null;
    free_gb: number | null;
    used_pct?: number | null;
  };
  gpu: {
    present: boolean;
    vram_total_gb: number | null;
    vram_free_gb: number | null;
    load_pct?: number | null;
    name?: string;
  };
}

export interface LocalSystemReport {
  verified: boolean;
  supported: boolean | null;
  capabilities?: SystemCapabilities | null;
  reasons?: string[];
  report?: Record<string, unknown> | null;
  decision?: {
    status: "APPROVED" | "LIMITED" | "BLOCKED";
    execution: {
      preferred: "gpu" | "cpu";
      fallback: "cpu" | null;
    } | null;
    reasons: string[];
    warnings: string[];
  } | null;
}

export interface RemoteModeContext {
  networkScope: NetworkScope | null;
  discoveryMode: "auto" | "manual" | null;

  discoveredHosts: HostInfo[];
  scanning: boolean;
  scanStartedAt: number | null;

  selectedHost: HostInfo | null;

  pairing: unknown;

  resources: ResourcesState | null;

  vpnRequired: boolean;
  vpnStatus: string;
  vpn: {
    required: boolean;
    connected: boolean;
  };

  probedHost: HostInfo | null;
  trustedHosts: HostInfo[];
}

export interface LocalModeContext {
  systemCheck: LocalSystemReport | null;
  resources: ResourcesState | null;
  profile: LocalSystemProfile | null;
}

export interface CloudModeContext {
  provider: string | null;
  account: string | null;
  region: string | null;
  resources: ResourcesState | null;
}

export interface PrebootContext {
  mode: RuntimeMode | null;
  perMode: {
    local: LocalModeContext;
    remote: RemoteModeContext;
    cloud: CloudModeContext;
  };

  preboot: unknown;
  network: unknown;

  system: LocalSystemReport;
  topology: TopologyState;
  resources: ResourcesState;
}
