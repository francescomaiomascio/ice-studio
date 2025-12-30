// tools/security/notifier.js
// ============================================================================
// ICE Studio — Security Notifier
// Reagisce a eventi di pairing / trust
// ============================================================================

class SecurityNotifier {
    constructor({ logger = console } = {}) {
        this.logger = logger;
    }

    onPairingRequested(pairing) {
        this.logger.info(
            "[SECURITY] Pairing request received:",
            pairing
        );
    }

    onPairingApproved(pairing) {
        this.logger.info(
            "[SECURITY] Pairing approved:",
            pairing
        );

        // QUI in futuro:
        // - trigger VPN
        // - trigger backend remote
        // - trigger token exchange
    }

    onTrustEstablished(peerInfo) {
        this.logger.info(
            "[SECURITY] Trust established with peer:",
            peerInfo
        );
    }
}

module.exports = SecurityNotifier;
