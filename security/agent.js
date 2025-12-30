// tools/security/agent.js
// ============================================================================
// ICE Studio — Security Agent (JS)
// Bridge tra Electron / Tools e PREBOOT Python
// ============================================================================

const fetch = require("node-fetch");

class SecurityAgent {
    constructor(options = {}) {
        this.prebootBase =
            options.prebootBase || "http://127.0.0.1:7040";
    }

    // --------------------------------------------------
    // NETWORK IDENTITY
    // --------------------------------------------------
    async getNetworkIdentity() {
        const res = await fetch(`${this.prebootBase}/preboot/network`);
        if (!res.ok) throw new Error("Failed to fetch network identity");
        return res.json();
    }

    // --------------------------------------------------
    // PAIRING
    // --------------------------------------------------
    async requestPairing(identityPayload) {
        const res = await fetch(
            `${this.prebootBase}/preboot/pairing/request`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(identityPayload),
            }
        );
        if (!res.ok) throw new Error("Pairing request failed");
        return res.json();
    }

    async listPairings() {
        const res = await fetch(
            `${this.prebootBase}/preboot/pairing/list`
        );
        if (!res.ok) throw new Error("Failed to list pairings");
        return res.json();
    }

    async approvePairing(requestId) {
        const res = await fetch(
            `${this.prebootBase}/preboot/pairing/approve`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ request_id: requestId }),
            }
        );
        if (!res.ok) throw new Error("Failed to approve pairing");
        return res.json();
    }

    // --------------------------------------------------
    // TRUST CHECK
    // --------------------------------------------------
    async hasApprovedPeer(hostId) {
        const url = new URL(`${this.prebootBase}/preboot/pairing/status`);
        if (hostId) url.searchParams.set("host_id", hostId);
        const res = await fetch(url.toString());
        if (!res.ok) return false;
        const data = await res.json();
        return data?.trusted === true;
    }
}

module.exports = SecurityAgent;
