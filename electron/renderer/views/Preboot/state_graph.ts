// LEGACY – intentionally disabled
// Preboot no longer uses phase-based state machines

export type PrebootState = {
  phase: "RUNTIME";
};

export const INITIAL_PREBOOT_STATE: PrebootState = {
  phase: "RUNTIME",
};

export function nextPrebootState(
  state: PrebootState
): PrebootState {
  return state;
}
