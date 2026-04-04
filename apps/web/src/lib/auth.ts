import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Verify API key from Authorization header against the corpus's stored key.
 * Returns the corpus if valid, or a Response error to return early.
 */
export async function verifyAgentApiKey(
  request: NextRequest,
  corpusId: string
): Promise<
  | { ok: true; corpus: { id: string; apiKey: string | null } }
  | { ok: false; response: Response }
> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      response: Response.json(
        { error: "Missing Authorization header. Use: Bearer <api_key>" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice(7);

  const corpus = await db
    .select({ id: cppCorpus.id, apiKey: cppCorpus.apiKey })
    .from(cppCorpus)
    .where(eq(cppCorpus.id, corpusId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!corpus) {
    return {
      ok: false,
      response: Response.json({ error: "Corpus not found" }, { status: 404 }),
    };
  }

  if (!corpus.apiKey || corpus.apiKey !== token) {
    return {
      ok: false,
      response: Response.json({ error: "Invalid API key" }, { status: 403 }),
    };
  }

  return { ok: true, corpus };
}
