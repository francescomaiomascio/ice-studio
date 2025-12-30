const logger = require("../logger/logger.js");
const fetchFn = globalThis.fetch;
if (typeof fetchFn !== "function") {
    throw new Error("Global fetch is not available in Electron main");
}

function registerSnowballIPC() {
    const { ipcMain } = require("electron");

    ipcMain.handle("snowball:launch", async (_event, payload) => {
        logger.logEvent(
            `SNOWBALL_LAUNCH_IPC ${JSON.stringify(payload || {})}`
        );
        try {
            const res = await fetchFn("http://127.0.0.1:7040/preboot/snowball/launch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload || {}),
            });
            if (!res.ok) throw new Error(`snowball_launch_failed_${res.status}`);
            return await res.json();
        } catch (err) {
            logger.logEvent(
                `SNOWBALL_LAUNCH_ERROR ${err?.message || String(err)}`
            );
            throw err;
        }
    });

    ipcMain.handle("runtime:switch-requested", async () => {
        logger.logEvent("RUNTIME_SWITCH_REQUESTED");
        return { ok: true };
    });
}

module.exports = { registerSnowballIPC };
