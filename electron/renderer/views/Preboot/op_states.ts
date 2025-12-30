// views/Preboot/op_states.ts
// Shared op-state enum for Preboot flow

export enum BootstrapOpState {
  INIT = "INIT",
  DISCOVERY = "DISCOVERY",
  VERIFYING_LOCAL = "VERIFYING_LOCAL",
  IDLE = "IDLE",
  SCANNING_LAN = "SCANNING_LAN",
  SCAN_RESULTS = "SCAN_RESULTS",
  APPLYING = "APPLYING",
  READY = "READY",
  ERROR = "ERROR",
}
