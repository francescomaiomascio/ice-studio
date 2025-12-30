export class SystemService {
  static async ensureReady(): Promise<void> {
    const system = (window as any).ICE_SYSTEM;
    if (!system) {
      throw new Error("ICE_SYSTEM bridge not available");
    }

    const status = await system.status();
    if (status?.started) return;
    await system.start();
  }
}
