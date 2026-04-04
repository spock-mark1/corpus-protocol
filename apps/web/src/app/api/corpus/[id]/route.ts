import { prisma } from "@/lib/prisma";

// GET /api/corpus/:id — Corpus detail + configuration
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const corpus = await prisma.corpus.findUnique({
      where: { id },
      include: {
        patrons: true,
        activities: { orderBy: { createdAt: "desc" }, take: 20 },
        approvals: { orderBy: { createdAt: "desc" }, take: 10 },
        revenues: { orderBy: { createdAt: "desc" }, take: 20 },
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
