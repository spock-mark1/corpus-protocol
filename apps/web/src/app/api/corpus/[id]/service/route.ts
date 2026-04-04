import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppCommerceServices, cppCommerceJobs } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/corpus/:id/service — Returns 402 with payment details (x402 storefront)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const service = await db
      .select()
      .from(cppCommerceServices)
      .where(eq(cppCommerceServices.corpusId, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!service) {
      return Response.json({ error: "No service registered for this Corpus" }, { status: 404 });
    }

    // Return 402 Payment Required with x402 payment details
    return Response.json(
      {
        price: Number(service.price),
        currency: service.currency,
        payee: service.walletAddress,
        chains: service.chains,
        chainId: 8453, // Base mainnet
        token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
        serviceName: service.serviceName,
        description: service.description,
        corpusId: id,
      },
      { status: 402 }
    );
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/corpus/:id/service — Submit x402 payment + create commerce job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const paymentHeader = request.headers.get("x-payment");
    if (!paymentHeader) {
      return Response.json(
        { error: "Missing X-PAYMENT header with payment signature" },
        { status: 400 }
      );
    }

    const service = await db
      .select()
      .from(cppCommerceServices)
      .where(eq(cppCommerceServices.corpusId, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!service) {
      return Response.json({ error: "No service registered for this Corpus" }, { status: 404 });
    }

    // Parse and verify payment header
    let payment: {
      from?: string;
      to?: string;
      value?: string;
      signature?: string;
      token?: string;
      chainId?: number;
    };
    try {
      payment = JSON.parse(paymentHeader);
    } catch {
      return Response.json({ error: "Invalid X-PAYMENT header format" }, { status: 400 });
    }

    // Verify required payment fields exist
    if (!payment.from || !payment.to || !payment.value || !payment.signature) {
      return Response.json(
        { error: "X-PAYMENT must include: from, to, value, signature" },
        { status: 400 }
      );
    }

    // Verify payee matches the service wallet
    if (payment.to.toLowerCase() !== service.walletAddress.toLowerCase()) {
      return Response.json(
        {
          error: "Payment 'to' address does not match service wallet",
          expected: service.walletAddress,
          received: payment.to,
        },
        { status: 400 }
      );
    }

    // Verify amount meets service price (USDC has 6 decimals)
    const paidAmount = BigInt(payment.value);
    const requiredAmount = BigInt(Math.floor(Number(service.price) * 1_000_000));
    if (paidAmount < requiredAmount) {
      return Response.json(
        {
          error: "Insufficient payment amount",
          required: requiredAmount.toString(),
          received: payment.value,
        },
        { status: 402 }
      );
    }

    // NOTE: Full EIP-3009 on-chain signature verification requires ethers/viem.
    // For hackathon MVP, we verify structure + field matching above.
    // Production should call verifyTypedData() against the USDC contract.

    const body = await request.json().catch(() => ({}));
    const payload = body.payload ?? body;

    // Authenticate requester corpus via API key
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Missing Authorization header. Use: Bearer <api_key>" },
        { status: 401 }
      );
    }
    const token = authHeader.slice(7);
    const requester = await db
      .select({ id: cppCorpus.id })
      .from(cppCorpus)
      .where(eq(cppCorpus.apiKey, token))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!requester) {
      return Response.json({ error: "Invalid API key" }, { status: 403 });
    }
    const requesterCorpusId = requester.id;

    const [job] = await db
      .insert(cppCommerceJobs)
      .values({
        corpusId: id,
        requesterCorpusId,
        serviceName: service.serviceName,
        payload: payload ?? undefined,
        paymentSig: payment.signature ?? paymentHeader,
        amount: service.price,
        status: "pending",
      })
      .returning();

    return Response.json({ id: job.id, jobId: job.id, status: "pending" }, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
