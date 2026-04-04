// World ID verification utilities for Corpus Protocol
// Server-side proof validation — used by Patron and Approval API routes.

export const WORLD_APP_ID = process.env.WORLD_APP_ID ?? "app_corpus_protocol";

export interface WorldIdProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: "orb" | "device";
}

const IS_DEV = process.env.NODE_ENV !== "production";
const DEMO_MODE = process.env.WORLD_ID_DEMO_MODE === "true";

/**
 * Verify a World ID proof on the server side.
 * Production: validates proof structure (actual verification done by /api/worldid/verify).
 * Development/demo: accepts structurally valid proofs.
 */
export async function verifyWorldIdProof(
  proof: WorldIdProof,
  _action: string,
  _signal?: string
): Promise<{ success: boolean; nullifier_hash: string; error?: string }> {
  // Validate proof structure
  if (!proof.nullifier_hash) {
    return { success: false, nullifier_hash: "", error: "Missing nullifier_hash" };
  }

  // Dev/demo mode: accept proofs with valid nullifier
  if (IS_DEV || DEMO_MODE) {
    return { success: true, nullifier_hash: proof.nullifier_hash };
  }

  // Production: proof was already verified by /api/worldid/verify (IDKit handleVerify).
  // Here we just validate the nullifier_hash is present for DB storage.
  if (proof.nullifier_hash && proof.proof) {
    return { success: true, nullifier_hash: proof.nullifier_hash };
  }

  return { success: false, nullifier_hash: proof.nullifier_hash, error: "Invalid proof" };
}
