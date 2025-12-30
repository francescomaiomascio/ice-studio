import type { RuntimeMode, RuntimeSessionState } from "./types.js";

class RuntimeSessionManager {
  private session: RuntimeSessionState = {
    active: false,
    mode: null,
    sessionId: null,
    runtimeId: null,
  };

  start(
    mode: RuntimeMode,
    sessionId: string | null,
    runtimeId: string | null
  ): void {
    this.assertInactive();
    this.session = {
      active: true,
      mode,
      sessionId,
      runtimeId,
    };
  }

  stop(): void {
    this.session = {
      active: false,
      mode: null,
      sessionId: null,
      runtimeId: null,
    };
  }

  assertInactive(): void {
    if (this.session.active) {
      throw new Error("[RuntimeSession] Runtime already active");
    }
  }

  assertActive(): void {
    if (!this.session.active) {
      throw new Error("[RuntimeSession] Runtime is not active");
    }
  }

  isActive(): boolean {
    return this.session.active;
  }

  get(): RuntimeSessionState {
    return { ...this.session };
  }
}

export const RuntimeSession = new RuntimeSessionManager();
