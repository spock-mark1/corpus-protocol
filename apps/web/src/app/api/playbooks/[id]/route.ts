import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppPlaybooks, cppPlaybookPurchases } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// GET /api/playbooks/:id — Playbook detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const purchaseCount = db
      .select({
        playbookId: cppPlaybookPurchases.playbookId,
        count: sql<number>`count(*)::int`.as("count"),
      })
      .from(cppPlaybookPurchases)
      .where(eq(cppPlaybookPurchases.playbookId, id))
      .groupBy(cppPlaybookPurchases.playbookId)
      .as("purchaseCount");

    const result = await db
      .select({
        id: cppPlaybooks.id,
        corpusId: cppPlaybooks.corpusId,
        corpusName: cppCorpus.name,
        title: cppPlaybooks.title,
        category: cppPlaybooks.category,
        channel: cppPlaybooks.channel,
        description: cppPlaybooks.description,
        price: cppPlaybooks.price,
        currency: cppPlaybooks.currency,
        version: cppPlaybooks.version,
        tags: cppPlaybooks.tags,
        status: cppPlaybooks.status,
        impressions: cppPlaybooks.impressions,
        engagementRate: cppPlaybooks.engagementRate,
        conversions: cppPlaybooks.conversions,
        periodDays: cppPlaybooks.periodDays,
        content: cppPlaybooks.content,
        purchases: purchaseCount.count,
        createdAt: cppPlaybooks.createdAt,
        updatedAt: cppPlaybooks.updatedAt,
      })
      .from(cppPlaybooks)
      .innerJoin(cppCorpus, eq(cppPlaybooks.corpusId, cppCorpus.id))
      .leftJoin(purchaseCount, eq(cppPlaybooks.id, purchaseCount.playbookId))
      .where(eq(cppPlaybooks.id, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!result) {
      return Response.json({ error: "Playbook not found" }, { status: 404 });
    }

    return Response.json({
      ...result,
      corpus: result.corpusName,
      corpusName: undefined,
      purchases: result.purchases ?? 0,
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/playbooks/:id — Update playbook (requires corpus apiKey)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json(
        { error: "Missing Authorization header. Use: Bearer <api_key>" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    const playbook = await db.query.cppPlaybooks.findFirst({
      where: eq(cppPlaybooks.id, id),
      with: {
        corpus: { columns: { apiKey: true } },
      },
    });

    if (!playbook) {
      return Response.json({ error: "Playbook not found" }, { status: 404 });
    }

    if (!playbook.corpus.apiKey || playbook.corpus.apiKey !== token) {
      return Response.json({ error: "Invalid API key" }, { status: 403 });
    }

    const body = await request.json();
    const allowed = [
      "title",
      "description",
      "price",
      "version",
      "status",
      "tags",
      "content",
      "impressions",
      "engagementRate",
      "conversions",
      "periodDays",
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        // Convert numeric fields to string for Decimal columns
        if ((key === "price" || key === "engagementRate") && typeof body[key] === "number") {
          data[key] = String(body[key]);
        } else {
          data[key] = body[key];
        }
      }
    }

    if (data.status && !["active", "inactive"].includes(data.status as string)) {
      return Response.json(
        { error: "status must be 'active' or 'inactive'" },
        { status: 400 }
      );
    }

    if (data.price !== undefined) {
      if (typeof body.price !== "number" || body.price <= 0) {
        return Response.json(
          { error: "price must be a positive number" },
          { status: 400 }
        );
      }
    }

    const [updated] = await db
      .update(cppPlaybooks)
      .set(data)
      .where(eq(cppPlaybooks.id, id))
      .returning();

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
