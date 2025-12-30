const fs = require("fs");
const path = require("path");

let stream = null;
let currentPhase = "preboot";

function resolveRendererPath(phase) {
    const launchDir = process.env.ICE_LAUNCH_DIR;
    if (!launchDir) {
        return null;
    }
    const dir =
        phase === "runtime"
            ? path.join(launchDir, "runtime", "ui")
            : path.join(launchDir, "preboot", "ui");
    return path.join(dir, "renderer.log");
}

function openStream(phase) {
    const file = resolveRendererPath(phase);
    if (!file) {
        return false;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    stream = fs.createWriteStream(file, { flags: "a" });
    return true;
}

function writeEvent(event) {
    const phase = (event?.phase || "").toString().toLowerCase();
    const nextPhase =
        phase === "runtime" || phase === "dashboard" || phase === "workspace"
            ? "runtime"
            : "preboot";
    if (!stream || nextPhase !== currentPhase) {
        if (stream) {
            stream.end();
            stream = null;
        }
        currentPhase = nextPhase;
        if (!openStream(currentPhase)) {
            return;
        }
    }

    const payload = {
        ts: event?.ts || new Date().toISOString(),
        level: event?.level || "INFO",
        domain: "ui",
        owner: event?.owner || "renderer",
        scope: event?.scope || event?.layer || "renderer",
        msg: event?.msg || "renderer_log",
        data: event?.data ?? event,
        phase: currentPhase,
    };

    stream.write(JSON.stringify(payload) + "\n");
}

function createRendererLogSink() {
    return (event) => {
        if (!event || typeof event !== "object") return;
        writeEvent(event);
    };
}

module.exports = { createRendererLogSink };
