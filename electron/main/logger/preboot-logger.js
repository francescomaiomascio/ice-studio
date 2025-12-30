const logger = require("./logger.js");

function appendPrebootLog(entry) {
    const payload = {
        ts: entry?.ts || new Date().toISOString(),
        evt: entry?.evt || "UNKNOWN",
        data: entry?.data || {},
    };
    logger.logEvent(
        `PREBOOT_LOG ${payload.evt} ${JSON.stringify(payload.data || {})}`
    );
}

function registerPrebootLogger(ipcMain) {
    ipcMain.on("preboot:log", (_event, payload) => appendPrebootLog(payload));
}

module.exports = {
    registerPrebootLogger,
};
