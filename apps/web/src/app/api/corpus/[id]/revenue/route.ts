import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppRevenues } from "@/db/schema";
import { verifyAgentApiKey } from "@/lib/auth";

// POST /api/corpus/:id/revenue — Report revenue (from Local Agent)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await verifyAgentApiKey(request, id);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { amount, currency, source, txHash } = body;

    const validSources = ["commerce", "direct", "subscription"];
    const validCurrencies = ["USDC", "HBAR", "USDT"];

    if (amount === undefined || !source) {
      return Response.json(
        { error: "amount, source are required" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return Response.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    if (!validSources.includes(source)) {
      return Response.json(
        { error: `source must be one of: ${validSources.join(", ")}` },
        { status: 400 }
      );
    }

    if (currency && !validCurrencies.includes(currency)) {
      return Response.json(
        { error: `currency must be one of: ${validCurrencies.join(", ")}` },
        { status: 400 }
      );
    }

    const [revenue] = await db
      .insert(cppRevenues)
      .values({
        corpusId: id,
        amount: String(amount),
        currency: currency ?? "USDC",
        source,
        txHash,
      })
      .returning();

    return Response.json(revenue, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
