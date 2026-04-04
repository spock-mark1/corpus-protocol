import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppCommerceServices, cppCommerceJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAgentApiKey } from "@/lib/auth";
import { broadcastTransferWithAuthorization } from "@/lib/circle";
import { fulfillInstant } from "@/lib/fulfillment";

// Arc network config (USDC = native gas token)
const ARC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? 480);
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x79A02482A880bCE3B13e09Da970dC34db4CD24d1";


// GET /api/corpus/:id/service — Returns 402 with payment details (x402 storefront)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [service, corpus] = await Promise.all([
      db
        .select()
        .from(cppCommerceServices)
        .where(eq(cppCommerceServices.corpusId, id))
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select({ agentWalletAddress: cppCorpus.agentWalletAddress })
        .from(cppCorpus)
        .where(eq(cppCorpus.id, id))
        .limit(1)
        .then((r) => r[0] ?? null),
    ]);

    if (!service) {
      return Response.json({ error: "No service registered for this Corpus" }, { status: 404 });
    }

    // payee: use service wallet if set, otherwise fall back to Circle agent wallet
    const payee = service.walletAddress || corpus?.agentWalletAddress;
    if (!payee) {
      return Response.json({ error: "No payment address configured for this Corpus" }, { status: 500 });
    }

    // Return 402 Payment Required with x402 payment details
    return Response.json(
      {
        price: Number(service.price),
        currency: service.currency,
        payee,
        chains: service.chains,
        chainId: ARC_CHAIN_ID,
        network: "arc",
        token: USDC_ADDRESS,
        serviceName: service.serviceName,
        description: service.description,
        fulfillmentMode: service.fulfillmentMode,
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

    const [service, providerCorpus] = await Promise.all([
      db
        .select()
        .from(cppCommerceServices)
        .where(eq(cppCommerceServices.corpusId, id))
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select({ agentWalletAddress: cppCorpus.agentWalletAddress })
        .from(cppCorpus)
        .where(eq(cppCorpus.id, id))
        .limit(1)
        .then((r) => r[0] ?? null),
    ]);

    if (!service) {
      return Response.json({ error: "No service registered for this Corpus" }, { status: 404 });
    }

    const expectedPayee = service.walletAddress || providerCorpus?.agentWalletAddress;

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

    // 3. Verify payee matches the service/agent wallet
    if (!expectedPayee || to.toLowerCase() !== expectedPayee.toLowerCase()) {
      return Response.json(
        { error: "Payment 'to' address does not match service wallet", expected: expectedPayee, received: to },
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

    // 5. Replay prevention — check nonce against existing jobs in DB
    if (nonce) {
      const existing = await db
        .select({ id: cppCommerceJobs.id })
        .from(cppCommerceJobs)
        .where(eq(cppCommerceJobs.paymentSig, signature as string))
        .limit(1)
        .then((r) => r[0] ?? null);
      if (existing) {
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

    // 7. Broadcast EIP-3009 transferWithAuthorization to Arc
    let txHash: string | null = null;
    try {
      const now = Math.floor(Date.now() / 1000);
      const result = await broadcastTransferWithAuthorization({
        from,
        to,
        value,
        validAfter: Number(payment.validAfter ?? 0),
        validBefore: Number(payment.validBefore ?? now + 300),
        nonce: nonce ?? "0x" + "0".repeat(64),
        signature,
        chainId: ARC_CHAIN_ID,
        tokenAddress: USDC_ADDRESS,
      });
      txHash = result.txHash;
    } catch (broadcastErr) {
      console.error("Arc broadcast failed:", broadcastErr);
      // If ARC_RELAYER_PRIVATE_KEY is not set, proceed without broadcast (testnet/demo mode)
      if (process.env.ARC_RELAYER_PRIVATE_KEY) {
        return Response.json(
          { error: "On-chain payment broadcast failed", details: String(broadcastErr) },
          { status: 502 }
        );
      }
    }

    // 8. Create commerce job + fulfill
    const body = await request.json().catch(() => ({}));
    const payload = body.payload ?? body;

    if (service.fulfillmentMode === "instant") {
      // Instant mode: server calls external API and returns result synchronously
      let result: Record<string, unknown>;
      try {
        result = await fulfillInstant(service.serviceName, payload ?? {});
      } catch (fulfillErr) {
        return Response.json(
          { error: "Service fulfillment failed", details: String(fulfillErr) },
          { status: 502 }
        );
      }

      const [job] = await db
        .insert(cppCommerceJobs)
        .values({
          corpusId: id,
          requesterCorpusId: requester.id,
          serviceName: service.serviceName,
          payload: payload ?? undefined,
          result,
          paymentSig: signature ?? paymentHeader,
          amount: service.price,
          status: "completed",
        })
        .returning();

      return Response.json(
        { id: job.id, jobId: job.id, status: "completed", result, txHash },
        { status: 201 }
      );
    }

    // Async mode: create pending job for agent to fulfill via polling
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

    return Response.json(
      { id: job.id, jobId: job.id, status: "pending", txHash },
      { status: 201 }
    );
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/corpus/:id/service — Register or update commerce service (upsert)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await verifyAgentApiKey(request, id);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { serviceName, description, price, walletAddress, chains, fulfillmentMode } = body;

    if (!serviceName || price == null) {
      return Response.json(
        { error: "serviceName and price are required" },
        { status: 400 }
      );
    }

    if (typeof price !== "number" || price <= 0) {
      return Response.json(
        { error: "price must be a positive number" },
        { status: 400 }
      );
    }

    // Get agent wallet as fallback for walletAddress
    const corpus = await db
      .select({ agentWalletAddress: cppCorpus.agentWalletAddress })
      .from(cppCorpus)
      .where(eq(cppCorpus.id, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    const serviceWallet = walletAddress || corpus?.agentWalletAddress;
    if (!serviceWallet) {
      return Response.json(
        { error: "walletAddress is required (no agent wallet available as fallback)" },
        { status: 400 }
      );
    }

    // Check if service already exists for this corpus
    const existing = await db
      .select({ id: cppCommerceServices.id })
      .from(cppCommerceServices)
      .where(eq(cppCommerceServices.corpusId, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (existing) {
      // Update existing service
      const [updated] = await db
        .update(cppCommerceServices)
        .set({
          serviceName,
          description: description ?? null,
          price: String(price),
          walletAddress: serviceWallet,
          chains: chains ?? ["arc"],
          fulfillmentMode: fulfillmentMode ?? "async",
        })
        .where(eq(cppCommerceServices.corpusId, id))
        .returning();
      return Response.json(updated);
    }

    // Create new service
    const [service] = await db
      .insert(cppCommerceServices)
      .values({
        corpusId: id,
        serviceName,
        description: description ?? null,
        price: String(price),
        walletAddress: serviceWallet,
        chains: chains ?? ["arc"],
        fulfillmentMode: fulfillmentMode ?? "async",
      })
      .returning();

    return Response.json(service, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
