import { db } from "@/db";
import { cppCorpus } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

/**
 * Mock token purchase endpoint.
 * In production this would initiate a real on-chain transfer;
 * here it simply validates the request and returns a fake tx hash.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const { buyerAddress, amount } = body as {
    buyerAddress?: string;
    amount?: number;
  };

  if (!buyerAddress || typeof buyerAddress !== "string") {
    return NextResponse.json({ error: "buyerAddress is required" }, { status: 400 });
  }
  if (!amount || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  const corpus = await db.query.cppCorpus.findFirst({
    where: eq(cppCorpus.id, id),
  });

  if (!corpus) {
    return NextResponse.json({ error: "Corpus not found" }, { status: 404 });
  }

  const pricePerToken = Number(corpus.pulsePrice);
  if (pricePerToken <= 0) {
    return NextResponse.json({ error: "Token is not available for purchase" }, { status: 400 });
  }

  const totalCost = Math.round(amount * pricePerToken * 1e6) / 1e6; // precision safe

  // --- Mock: generate fake tx hash ---
  const txHash = `0x${randomBytes(32).toString("hex")}`;

  return NextResponse.json({
    success: true,
    txHash,
    tokenSymbol: corpus.tokenSymbol ?? "PULSE",
    amount,
    pricePerToken,
    totalCost,
    currency: "USDC",
    message: `Successfully purchased ${amount.toLocaleString()} ${corpus.tokenSymbol ?? "PULSE"} for $${totalCost.toFixed(2)} USDC (mock)`,
  });
}
