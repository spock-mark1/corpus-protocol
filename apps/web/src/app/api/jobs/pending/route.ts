import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppCommerceJobs } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

// GET /api/jobs/pending — Get pending jobs for the authenticated corpus (as service provider)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Missing Authorization header" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const corpus = await db
      .select({ id: cppCorpus.id })
      .from(cppCorpus)
      .where(eq(cppCorpus.apiKey, token))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!corpus) {
      return Response.json({ error: "Invalid API key" }, { status: 403 });
    }

    const jobs = await db
      .select()
      .from(cppCommerceJobs)
      .where(
        and(
          eq(cppCommerceJobs.corpusId, corpus.id),
          eq(cppCommerceJobs.status, "pending")
        )
      )
      .orderBy(asc(cppCommerceJobs.createdAt))
      .limit(20);

    return Response.json(jobs);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
