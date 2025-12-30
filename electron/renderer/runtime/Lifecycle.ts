// runtime/Lifecycle.ts
// ============================================================================
// ICE Studio GUI — Runtime Lifecycle Contracts
// ============================================================================

export interface Lifecycle {
  start(): void;
  stop(): void;
}

export interface Disposable {
  dispose(): void;
}
