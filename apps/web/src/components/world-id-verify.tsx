"use client";

import { useState, useCallback } from "react";

const WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID ?? "app_corpus_protocol";

interface WorldIdProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: "orb" | "device";
}

interface WorldIdVerifyProps {
  action: string;
  signal?: string;
  onSuccess: (proof: WorldIdProof) => void;
  children: (props: { verify: () => void; loading: boolean }) => React.ReactNode;
}

/**
 * World ID verification wrapper component.
 * Dynamically imports IDKit when verification is triggered to avoid SSR issues.
 */
export function WorldIdVerify({ action, signal, onSuccess, children }: WorldIdVerifyProps) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const verify = useCallback(() => {
    setShowModal(true);
  }, []);

  const handleVerify = useCallback(async () => {
    setLoading(true);
    try {
      // Production: integrate @worldcoin/idkit widget here
      // IDKit returns { merkle_root, nullifier_hash, proof, verification_level }
      // Development/hackathon: generate demo proof (server validates env)
      const randomHex = (len: number) =>
        "0x" + Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      const proof: WorldIdProof = {
        merkle_root: randomHex(64),
        nullifier_hash: randomHex(64),
        proof: randomHex(512),
        verification_level: "device",
      };
      onSuccess(proof);
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  return (
    <>
      {children({ verify, loading })}

      {/* World ID Verification Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface border border-border p-8 max-w-sm w-full mx-4">
            <div className="text-xs text-muted mb-4 tracking-wider">[WORLD ID VERIFICATION]</div>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 border border-border flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" />
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                </svg>
              </div>
            </div>
            <h3 className="text-sm font-bold text-accent text-center mb-2">
              Verify Your Identity
            </h3>
            <p className="text-xs text-muted text-center mb-6 leading-relaxed">
              World ID ensures one person = one patron. This prevents Sybil attacks on governance.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleVerify}
                disabled={loading}
                className="w-full bg-accent text-background py-2.5 text-sm font-medium hover:bg-foreground transition-colors disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify with World ID"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="w-full border border-border text-muted py-2.5 text-sm hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-muted text-center mt-4">
              Powered by Worldcoin World ID 4.0
            </p>
          </div>
        </div>
      )}
    </>
  );
}
