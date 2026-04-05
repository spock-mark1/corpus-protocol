import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppCommerceServices, cppCommerceJobs, cppRevenues } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAgentApiKey } from "@/lib/auth";
import { broadcastTransferWithAuthorization, getUsdcBalance } from "@/lib/circle";
import { fulfillInstant } from "@/lib/fulfillment";
import { registerServiceSchema, parseBody } from "@/lib/schemas";

// Arc network config (USDC = native gas token)
const ARC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? 5042002);
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x3600000000000000000000000000000000000000";


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

    // 1b. Read body once (request body can only be consumed once)
    const requestBody = await request.json().catch(() => ({})) as Record<string, unknown>;

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

    if (!from || !to || !value || !signature || !nonce) {
      return Response.json(
        { error: "X-PAYMENT must include: from, to, value, signature, nonce" },
        { status: 400 }
      );
    }

    // 3. Verify payee matches the service/agent wallet
    if (!expectedPayee || to.toLowerCase() !== expectedPayee.toLowerCase()) {
      return Response.json(
        { error: "Payment 'to' address does not match service wallet" },
        { status: 400 }
      );
    }

    // 4. Verify amount (USDC 6 decimals, string-based to avoid float rounding)
    const paidAmount = BigInt(value);
    const priceParts = String(service.price).split(".");
    const whole = priceParts[0];
    const frac = (priceParts[1] ?? "").slice(0, 6).padEnd(6, "0");
    const requiredAmount = BigInt(whole + frac);
    if (paidAmount < requiredAmount) {
      return Response.json(
        { error: "Insufficient payment amount" },
        { status: 402 }
      );
    }

    // 5. Replay prevention — check signature against existing jobs in DB
    const existingJob = await db
      .select({ id: cppCommerceJobs.id })
      .from(cppCommerceJobs)
      .where(eq(cppCommerceJobs.paymentSig, signature))
      .limit(1)
      .then((r) => r[0] ?? null);
    if (existingJob) {
      return Response.json({ error: "Payment signature already used (replay detected)" }, { status: 409 });
    }

    // 6. EIP-3009 signature verification
    const { ethers } = await import("ethers");
    const EIP3009_DOMAIN = {
      name: "USDC",
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

    const paymentNow = Math.floor(Date.now() / 1000);
    const validAfter = Number(payment.validAfter ?? 0);
    const validBefore = Number(payment.validBefore ?? paymentNow + 300);

    try {

      if (paymentNow < validAfter) {
        return Response.json({ error: "Payment signature is not yet valid" }, { status: 403 });
      }
      if (paymentNow > validBefore) {
        return Response.json({ error: "Payment signature has expired" }, { status: 403 });
      }

      const sigValue = {
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
      };
      const recovered = ethers.verifyTypedData(EIP3009_DOMAIN, EIP3009_TYPES, sigValue, signature);
      if (recovered.toLowerCase() !== from.toLowerCase()) {
        return Response.json(
          { error: "Invalid payment signature: signer mismatch" },
          { status: 403 }
        );
      }
    } catch (sigErr) {
      console.error("Payment signature verification failed:", sigErr);
      return Response.json({ error: "Invalid payment signature" }, { status: 403 });
    }

    // 7. Recheck payer balance before fulfillment
    try {
      const payerBalance = await getUsdcBalance(from);
      if (payerBalance < paidAmount) {
        return Response.json(
          { error: "Insufficient USDC balance" },
          { status: 402 }
        );
      }
    } catch {
      return Response.json(
        { error: "Unable to verify payer balance" },
        { status: 503 }
      );
    }

    // 8. Broadcast EIP-3009 transferWithAuthorization to Arc (mandatory)
    if (!process.env.ARC_RELAYER_PRIVATE_KEY) {
      return Response.json(
        { error: "Payment infrastructure not configured" },
        { status: 503 }
      );
    }

    let txHash: string;
    try {
      const result = await broadcastTransferWithAuthorization({
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        signature,
        chainId: ARC_CHAIN_ID,
        tokenAddress: USDC_ADDRESS,
      });
      txHash = result.txHash;
    } catch (broadcastErr) {
      console.error("Arc broadcast failed:", broadcastErr);
      return Response.json(
        { error: "On-chain payment broadcast failed" },
        { status: 502 }
      );
    }

    // 9. Create commerce job + fulfill
    const payload = (requestBody.payload ?? requestBody) as Record<string, unknown>;

    if (service.fulfillmentMode === "instant") {
      // Instant mode: server calls external API and returns result synchronously
      let result: Record<string, unknown>;
      try {
        result = await fulfillInstant(service.serviceName, payload ?? {});
      } catch (fulfillErr) {
        console.error("Service fulfillment failed:", fulfillErr);
        return Response.json(
          { error: "Service fulfillment failed" },
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
          paymentSig: signature,
          txHash,
          amount: service.price,
          status: "completed",
        })
        .returning();

      // Record revenue for the service provider
      await db.insert(cppRevenues).values({
        corpusId: id,
        amount: service.price,
        currency: service.currency ?? "USDC",
        source: "commerce",
        txHash,
      });

      return Response.json(
        { id: job.id, jobId: job.id, status: "completed", result, txHash },
        { status: 201 }
      );
    }

    // Async mode: create pending job for agent to fulfill via polling
    // Revenue is recorded when the job is fulfilled, not on creation
    const [job] = await db
      .insert(cppCommerceJobs)
      .values({
        corpusId: id,
        requesterCorpusId: requester.id,
        serviceName: service.serviceName,
        payload: payload ?? undefined,
        paymentSig: signature,
        txHash,
        amount: service.price,
        status: "pending",
      })
      .returning();

    return Response.json(
      { id: job.id, jobId: job.id, status: "pending", txHash },
      { status: 201 }
    );
  } catch (err: unknown) {
    // Catch unique constraint violation on paymentSig (replay race condition)
    const e = err as Record<string, unknown>;
    if (e?.code === "23505" && String(e?.constraint ?? "").includes("paymentSig")) {
      return Response.json({ error: "Payment signature already used (replay detected)" }, { status: 409 });
    }
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

    const parsed = await parseBody(request, registerServiceSchema);
    if (parsed.error) return parsed.error;

    const { serviceName, description, price, walletAddress, chains, fulfillmentMode } = parsed.data;

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
