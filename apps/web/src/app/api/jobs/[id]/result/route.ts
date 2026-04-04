import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppCommerceJobs } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Resolve the caller's corpus ID from their Bearer API key.
 * Returns null if auth is missing or invalid.
 */
async function resolveCallerCorpus(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const corpus = await db
    .select({ id: cppCorpus.id })
    .from(cppCorpus)
    .where(eq(cppCorpus.apiKey, token))
    .limit(1)
    .then((r) => r[0] ?? null);
  return corpus?.id ?? null;
}

// POST /api/jobs/:id/result — Submit job result (from service provider agent)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const callerCorpusId = await resolveCallerCorpus(request);
    if (!callerCorpusId) {
      return Response.json({ error: "Missing or invalid Authorization" }, { status: 401 });
    }

    const body = await request.json();
    const { result } = body;

    if (!result) {
      return Response.json({ error: "result is required" }, { status: 400 });
    }

    const job = await db
      .select()
      .from(cppCommerceJobs)
      .where(eq(cppCommerceJobs.id, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!job) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    // Only the service provider corpus can submit results
    if (job.corpusId !== callerCorpusId) {
      return Response.json({ error: "Not authorized to fulfill this job" }, { status: 403 });
    }

    const [updated] = await db
      .update(cppCommerceJobs)
      .set({
        result,
        status: "completed",
      })
      .where(eq(cppCommerceJobs.id, id))
      .returning();

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/jobs/:id/result — Poll for job result (from requester agent)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const callerCorpusId = await resolveCallerCorpus(request);
    if (!callerCorpusId) {
      return Response.json({ error: "Missing or invalid Authorization" }, { status: 401 });
    }

    const job = await db
      .select()
      .from(cppCommerceJobs)
      .where(eq(cppCommerceJobs.id, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!job) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    // Only the provider or requester can view results
    if (job.corpusId !== callerCorpusId && job.requesterCorpusId !== callerCorpusId) {
      return Response.json({ error: "Not authorized to view this job" }, { status: 403 });
    }

    return Response.json({
      id: job.id,
      status: job.status,
      result: job.result,
      corpusId: job.corpusId,
      serviceName: job.serviceName,
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
