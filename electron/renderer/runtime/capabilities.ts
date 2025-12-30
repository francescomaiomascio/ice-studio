export type RuntimeOS = "linux" | "macos" | "windows" | "unknown";
export type RuntimeArch = "x86_64" | "arm64" | "unknown";

export interface RuntimeCapabilities {
  os: RuntimeOS;
  arch: RuntimeArch;
  ramTotalGB: number | null;
  ramFreeGB: number | null;
  cpuCores: number | null;
  gpu: {
    present: boolean | null;
    vramTotalGB: number | null;
    vramFreeGB: number | null;
    utilizationPct: number | null;
    name?: string;
  };
  backendAvailable: boolean;
}
