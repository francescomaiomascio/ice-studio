const logger = require("./logger.js");

function appendHttpEvent(event = {}) {
    if (!event || typeof event !== "object") {
        return;
    }
    const payload = {
        ts: new Date().toISOString(),
        layer: "http",
        service: "electron-main",
        ...event,
    };
    logger.logEvent(JSON.stringify(payload));
}

module.exports = {
    appendHttpEvent,
};
