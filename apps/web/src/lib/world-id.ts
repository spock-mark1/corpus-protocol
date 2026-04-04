// World ID verification utilities for Corpus Protocol
// Uses World ID's cloud verification API

export const WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID ?? "app_corpus_protocol";

export interface WorldIdProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: "orb" | "device";
}

const IS_DEV = process.env.NODE_ENV !== "production";

/**
 * Verify a World ID proof on the server side.
 * Production: calls World ID cloud verification API (fail-closed).
 * Development: accepts structurally valid proofs for testing.
 */
export async function verifyWorldIdProof(
  proof: WorldIdProof,
  action: string,
  signal?: string
): Promise<{ success: boolean; nullifier_hash: string; error?: string }> {
  // Validate proof structure first
  if (!proof.merkle_root || !proof.nullifier_hash || !proof.proof) {
    return { success: false, nullifier_hash: proof.nullifier_hash ?? "", error: "Invalid proof structure" };
  }

  // Development/hackathon: accept structurally valid proofs
  if (IS_DEV) {
    return { success: true, nullifier_hash: proof.nullifier_hash };
  }

  // Production: verify against World ID cloud API
  const appId = process.env.WORLD_APP_ID ?? WORLD_APP_ID;

  try {
    const res = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/${appId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merkle_root: proof.merkle_root,
          nullifier_hash: proof.nullifier_hash,
          proof: proof.proof,
          verification_level: proof.verification_level,
          action,
          signal: signal ?? "",
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      return { success: true, nullifier_hash: data.nullifier_hash ?? proof.nullifier_hash };
    }

    const err = await res.json().catch(() => ({}));
    return { success: false, nullifier_hash: proof.nullifier_hash, error: err.detail ?? "Verification failed" };
  } catch {
    // Fail closed in production
    return { success: false, nullifier_hash: proof.nullifier_hash, error: "World ID verification service unavailable" };
  }
}
