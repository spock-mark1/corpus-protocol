import { NextResponse } from "next/server";

const DEMO_MODE = process.env.WORLD_ID_DEMO_MODE === "true";
const RP_ID = process.env.WORLD_RP_ID || "";

// POST /api/worldid/verify — Verify World ID proof via v4 API
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rp_id, idkitResponse } = body;

    // Extract nullifier for DB storage
    const nullifier_hash =
      body.nullifier_hash ||
      idkitResponse?.responses?.[0]?.nullifier ||
      idkitResponse?.nullifier_hash ||
      "";

    if (DEMO_MODE) {
      return NextResponse.json({ success: true, verified: true, nullifier_hash });
    }

    const rpId = rp_id || RP_ID;
    if (!rpId) {
      return NextResponse.json({ error: "RP ID not configured" }, { status: 503 });
    }

    // Forward IDKit result to World ID v4 verification API
    const payload = idkitResponse || body;

    const verifyRes = await fetch(
      `https://developer.world.org/api/v4/verify/${rpId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const result = await verifyRes.json();

    if (verifyRes.ok && result.success) {
      return NextResponse.json({ success: true, verified: true, nullifier_hash });
    }

    return NextResponse.json(
      { error: "World ID verification failed", detail: result },
      { status: 400 }
    );
  } catch (error) {
    console.error("World ID verify error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
