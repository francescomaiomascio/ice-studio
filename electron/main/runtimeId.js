let runtimeId = null;

function initRuntimeId() {
  if (!runtimeId) {
    runtimeId = process.env.ICE_RUNTIME_ID || null;
  }
  return runtimeId;
}

function getRuntimeId() {
  return runtimeId;
}

module.exports = { initRuntimeId, getRuntimeId };
