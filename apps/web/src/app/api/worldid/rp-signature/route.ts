import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit/signing";

// POST /api/worldid/rp-signature — Generate RP context for IDKit widget
export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    const signingKey = process.env.WORLD_ID_SIGNING_KEY;

    if (!signingKey) {
      return NextResponse.json(
        { error: "RP signing key not configured" },
        { status: 503 }
      );
    }

    const actionId = action || process.env.WORLD_ACTION_PATRON || "become-patron";
    const result = signRequest(actionId, signingKey);

    return NextResponse.json({
      sig: result.sig,
      nonce: result.nonce,
      created_at: result.createdAt,
      expires_at: result.expiresAt,
    });
  } catch (error) {
    console.error("RP signature error:", error);
    return NextResponse.json(
      { error: "Failed to generate RP signature" },
      { status: 500 }
    );
  }
}
