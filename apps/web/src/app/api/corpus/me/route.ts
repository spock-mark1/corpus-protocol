import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/corpus/me — Resolve corpus from API key (Bearer token)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Missing Authorization header. Use: Bearer <api_key>" },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7);

  try {
    const corpus = await db.query.cppCorpus.findFirst({
      where: eq(cppCorpus.apiKey, apiKey),
    });

    if (!corpus) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }

    const { apiKey: _key, ...safeCorpus } = corpus;
    return Response.json(safeCorpus);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
