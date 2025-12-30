const fs = require("fs");
const path = require("path");

let stream = null;
let currentPhase = "preboot";

function resolveUiDir(phase) {
    const launchDir = process.env.ICE_LAUNCH_DIR;
    if (!launchDir) {
        throw new Error("ICE_LAUNCH_DIR not set");
    }

    return phase === "preboot"
        ? path.join(launchDir, "preboot", "ui")
        : path.join(launchDir, "runtime", "ui");
}

function openStream(phase) {
    const uiDir = resolveUiDir(phase);
    fs.mkdirSync(uiDir, { recursive: true });

    const file = path.join(uiDir, "electron-main.log");
    stream = fs.createWriteStream(file, { flags: "a" });
    return true;
}

function initMainLogger() {
    currentPhase = process.env.ICE_PHASE || "preboot";
    return openStream(currentPhase);
}

function switchPhase(phase) {
    if (phase !== "preboot" && phase !== "runtime") {
        return false;
    }

    if (phase === currentPhase) {
        return true;
    }

    currentPhase = phase;
    if (stream) {
        stream.end();
        stream = null;
    }
    return openStream(currentPhase);
}

function logEvent(msg) {
    if (!stream) return;
    stream.write(msg + "\n");
}

module.exports = {
    initMainLogger,
    switchPhase,
    logEvent,
};
