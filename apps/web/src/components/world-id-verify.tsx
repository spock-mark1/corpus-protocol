"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues (IDKit uses browser APIs)
const IDKitRequestWidget = dynamic(
  () => import("@worldcoin/idkit").then((mod) => mod.IDKitRequestWidget),
  { ssr: false }
);

// Load deviceLegacy preset only on client
let deviceLegacyPreset: ((opts?: { signal?: string }) => unknown) | null = null;
if (typeof window !== "undefined") {
  import("@worldcoin/idkit").then((mod) => {
    deviceLegacyPreset = mod.deviceLegacy;
  });
}

const WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID ?? "app_corpus_protocol";
const WORLD_RP_ID = process.env.NEXT_PUBLIC_WORLD_RP_ID ?? "";

export const WORLD_ACTIONS = {
  patron: process.env.NEXT_PUBLIC_WORLD_ACTION_PATRON ?? "become-patron",
  approve: process.env.NEXT_PUBLIC_WORLD_ACTION_APPROVE ?? "approve-decision",
} as const;

export interface WorldIdProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: "orb" | "device";
}

interface RpContext {
  rp_id: string;
  nonce: string;
  created_at: string;
  expires_at: string;
  signature: string;
}

interface WorldIdVerifyProps {
  action?: string;
  signal?: string;
  onSuccess: (proof: WorldIdProof) => void;
  children: (props: { verify: () => void; loading: boolean }) => React.ReactNode;
}

/**
 * World ID verification component using IDKit v4.
 * 3-step flow: RP signature → IDKit widget → server verify.
 */
export function WorldIdVerify({ action, signal, onSuccess, children }: WorldIdVerifyProps) {
  const [loading, setLoading] = useState(false);
  const [idkitOpen, setIdkitOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);

  const verify = useCallback(async () => {
    setLoading(true);
    try {
      // Step 1: Get RP signature from server
      const rpRes = await fetch("/api/worldid/rp-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action || WORLD_ACTIONS.patron }),
      });

      if (!rpRes.ok) {
        throw new Error("Failed to get RP signature");
      }

      const rpSig = await rpRes.json();
      setRpContext({
        rp_id: WORLD_RP_ID,
        nonce: rpSig.nonce,
        created_at: rpSig.created_at,
        expires_at: rpSig.expires_at,
        signature: rpSig.sig,
      });

      // Step 2: Open IDKit widget
      setIdkitOpen(true);
    } catch (err) {
      console.error("World ID verify start error:", err);
      setLoading(false);
    }
  }, [action]);

  // Step 2.5: handleVerify — server-side proof verification
  const handleVerify = useCallback(async (result: unknown) => {
    const res = await fetch("/api/worldid/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rp_id: WORLD_RP_ID,
        idkitResponse: result,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Verification failed");
    }
  }, []);

  // Step 3: Success — extract proof and pass to parent
  const handleSuccess = useCallback(
    (result: unknown) => {
      setIdkitOpen(false);
      setLoading(false);

      // Extract fields from IDKit v4 result
      const r = result as Record<string, unknown>;
      const responses = r.responses as Array<Record<string, unknown>> | undefined;
      const firstResponse = responses?.[0];

      const proof: WorldIdProof = {
        merkle_root: (firstResponse?.proof as string[])?.[4] ?? String(r.merkle_root ?? ""),
        nullifier_hash: String(firstResponse?.nullifier ?? r.nullifier_hash ?? ""),
        proof: JSON.stringify(firstResponse?.proof ?? r.proof ?? ""),
        verification_level: "device",
      };

      onSuccess(proof);
    },
    [onSuccess]
  );

  const handleOpenChange = useCallback((open: boolean) => {
    setIdkitOpen(open);
    if (!open) setLoading(false);
  }, []);

  return (
    <>
      {children({ verify, loading })}

      {rpContext && (
        <IDKitRequestWidget
          app_id={WORLD_APP_ID as `app_${string}`}
          action={action || WORLD_ACTIONS.patron}
          rp_context={rpContext as never}
          allow_legacy_proofs={true as never}
          preset={deviceLegacyPreset ? (deviceLegacyPreset({ signal }) as never) : ("device" as never)}
          open={idkitOpen}
          onOpenChange={handleOpenChange}
          handleVerify={handleVerify as never}
          onSuccess={handleSuccess as never}
          autoClose
        />
      )}
    </>
  );
}
