import { db } from "@/db";
import { cppCorpus } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/corpus/:id — Corpus detail + configuration
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const corpus = await db.query.cppCorpus.findFirst({
      where: eq(cppCorpus.id, id),
      with: {
        patrons: true,
        activities: { orderBy: (a, { desc }) => [desc(a.createdAt)], limit: 20 },
        approvals: { orderBy: (a, { desc }) => [desc(a.createdAt)], limit: 10 },
        revenues: { orderBy: (r, { desc }) => [desc(r.createdAt)], limit: 20 },
        commerceServices: true,
      },
    });

    if (!corpus) {
      return Response.json({ error: "Corpus not found" }, { status: 404 });
    }

    // Exclude apiKey from response
    const { apiKey: _apiKey, ...safeCorpus } = corpus;
    return Response.json(safeCorpus);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
