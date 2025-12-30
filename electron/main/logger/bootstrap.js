const path = require("path");

function resolveLogBase() {
    const phase = process.env.ICE_PHASE || "preboot";
    const launchDir = process.env.ICE_LAUNCH_DIR;
    if (!launchDir) {
        throw new Error("ICE_LAUNCH_DIR missing");
    }
    return phase === "preboot"
        ? path.join(launchDir, "preboot", "ui")
        : path.join(launchDir, "runtime", "ui");
}

module.exports = { resolveLogBase };
