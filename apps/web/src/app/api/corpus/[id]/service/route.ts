import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppCommerceServices, cppCommerceJobs } from "@/db/schema";
import { eq } from "drizzle-orm";

// Arc network config (USDC = native gas token)
const ARC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? 480);
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x79A02482A880bCE3B13e09Da970dC34db4CD24d1";

// In-memory nonce set for replay prevention (production: use Redis or DB table)
const usedNonces = new Set<string>();

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
        chainId: ARC_CHAIN_ID,
        network: "arc",
        token: USDC_ADDRESS,
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
    // 1. Authenticate requester corpus via API key (check early)
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Missing Authorization header. Use: Bearer <api_key>" },
        { status: 401 }
      );
    }
    const apiKeyToken = authHeader.slice(7);
    const requester = await db
      .select({ id: cppCorpus.id })
      .from(cppCorpus)
      .where(eq(cppCorpus.apiKey, apiKeyToken))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!requester) {
      return Response.json({ error: "Invalid API key" }, { status: 403 });
    }

    // 2. Validate X-PAYMENT header
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

    // Parse payment header
    let payment: Record<string, unknown>;
    try {
      payment = JSON.parse(paymentHeader);
    } catch {
      return Response.json({ error: "Invalid X-PAYMENT header format" }, { status: 400 });
    }

    const from = payment.from as string | undefined;
    const to = payment.to as string | undefined;
    const value = payment.value as string | undefined;
    const signature = payment.signature as string | undefined;
    const nonce = payment.nonce as string | undefined;

    if (!from || !to || !value || !signature) {
      return Response.json(
        { error: "X-PAYMENT must include: from, to, value, signature" },
        { status: 400 }
      );
    }

    // 3. Verify payee matches the service wallet
    if (to.toLowerCase() !== service.walletAddress.toLowerCase()) {
      return Response.json(
        { error: "Payment 'to' address does not match service wallet", expected: service.walletAddress, received: to },
        { status: 400 }
      );
    }

    // 4. Verify amount (USDC 6 decimals)
    const paidAmount = BigInt(value);
    const requiredAmount = BigInt(Math.floor(Number(service.price) * 1_000_000));
    if (paidAmount < requiredAmount) {
      return Response.json(
        { error: "Insufficient payment amount", required: requiredAmount.toString(), received: value },
        { status: 402 }
      );
    }

    // 5. Replay prevention — check nonce hasn't been used
    if (nonce) {
      if (usedNonces.has(nonce)) {
        return Response.json({ error: "Payment nonce already used (replay detected)" }, { status: 409 });
      }
    }

    // 6. EIP-3009 signature verification
    const { ethers } = await import("ethers");
    const EIP3009_DOMAIN = {
      name: "USD Coin",
      version: "2",
      chainId: ARC_CHAIN_ID,
      verifyingContract: USDC_ADDRESS,
    };
    const EIP3009_TYPES = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    };

    try {
      const now = Math.floor(Date.now() / 1000);
      const validAfter = Number(payment.validAfter ?? 0);
      const validBefore = Number(payment.validBefore ?? now + 300);

      if (now < validAfter) {
        return Response.json({ error: "Payment signature is not yet valid", validAfter, now }, { status: 403 });
      }
      if (now > validBefore) {
        return Response.json({ error: "Payment signature has expired", validBefore, now }, { status: 403 });
      }

      const sigValue = {
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce: nonce ?? ethers.ZeroHash,
      };
      const recovered = ethers.verifyTypedData(EIP3009_DOMAIN, EIP3009_TYPES, sigValue, signature);
      if (recovered.toLowerCase() !== from.toLowerCase()) {
        return Response.json(
          { error: "Invalid payment signature: signer mismatch", expected: from, recovered },
          { status: 403 }
        );
      }
    } catch (sigErr) {
      return Response.json({ error: "Invalid payment signature", details: String(sigErr) }, { status: 403 });
    }

    // 7. Mark nonce as used (after successful verification)
    if (nonce) {
      usedNonces.add(nonce);
    }

    // 8. Create commerce job
    const body = await request.json().catch(() => ({}));
    const payload = body.payload ?? body;

    const [job] = await db
      .insert(cppCommerceJobs)
      .values({
        corpusId: id,
        requesterCorpusId: requester.id,
        serviceName: service.serviceName,
        payload: payload ?? undefined,
        paymentSig: signature ?? paymentHeader,
        amount: service.price,
        status: "pending",
      })
      .returning();

    return Response.json({ id: job.id, jobId: job.id, status: "pending" }, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
