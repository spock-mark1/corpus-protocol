import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppPlaybooks, cppPlaybookPurchases } from "@/db/schema";
import { and, arrayContains, desc, eq, ilike, or, sql } from "drizzle-orm";

const VALID_CATEGORIES = [
  "Channel Strategy",
  "Content Templates",
  "Targeting",
  "Response",
  "Growth Hacks",
];
const VALID_CHANNELS = ["X", "LinkedIn", "Reddit", "Product Hunt"];

// GET /api/playbooks — List playbooks (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category");
    const channel = searchParams.get("channel");
    const search = searchParams.get("search");

    const conditions = [eq(cppPlaybooks.status, "active")];

    if (category && category !== "All") {
      conditions.push(eq(cppPlaybooks.category, category));
    }
    if (channel && channel !== "All") {
      conditions.push(eq(cppPlaybooks.channel, channel));
    }
    if (search) {
      conditions.push(
        or(
          ilike(cppPlaybooks.title, `%${search}%`),
          ilike(cppPlaybooks.description, `%${search}%`),
          arrayContains(cppPlaybooks.tags, [search.toLowerCase()]),
        )!
      );
    }

    const purchaseCount = db
      .select({
        playbookId: cppPlaybookPurchases.playbookId,
        count: sql<number>`count(*)::int`.as("count"),
      })
      .from(cppPlaybookPurchases)
      .groupBy(cppPlaybookPurchases.playbookId)
      .as("purchaseCount");

    const playbooks = await db
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
        purchases: purchaseCount.count,
        createdAt: cppPlaybooks.createdAt,
      })
      .from(cppPlaybooks)
      .innerJoin(cppCorpus, eq(cppPlaybooks.corpusId, cppCorpus.id))
      .leftJoin(purchaseCount, eq(cppPlaybooks.id, purchaseCount.playbookId))
      .where(and(...conditions))
      .orderBy(desc(cppPlaybooks.createdAt));

    const data = playbooks.map((p) => ({
      ...p,
      corpus: p.corpusName,
      corpusName: undefined,
      purchases: p.purchases ?? 0,
    }));

    return Response.json(data);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/playbooks — Create a playbook (requires corpus apiKey)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json(
        { error: "Missing Authorization header. Use: Bearer <api_key>" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const corpus = await db
      .select({ id: cppCorpus.id, apiKey: cppCorpus.apiKey })
      .from(cppCorpus)
      .where(eq(cppCorpus.apiKey, token))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!corpus) {
      return Response.json({ error: "Invalid API key" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      category,
      channel,
      description,
      price,
      tags,
      impressions,
      engagementRate,
      conversions,
      periodDays,
    } = body;

    if (!title || !category || !channel || !description || price == null) {
      return Response.json(
        { error: "title, category, channel, description, price are required" },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return Response.json(
        { error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!VALID_CHANNELS.includes(channel)) {
      return Response.json(
        { error: `channel must be one of: ${VALID_CHANNELS.join(", ")}` },
        { status: 400 }
      );
    }

    if (typeof price !== "number" || price <= 0) {
      return Response.json(
        { error: "price must be a positive number" },
        { status: 400 }
      );
    }

    const [playbook] = await db
      .insert(cppPlaybooks)
      .values({
        corpusId: corpus.id,
        title,
        category,
        channel,
        description,
        price: String(price),
        tags: tags ?? [],
        impressions: impressions ?? 0,
        engagementRate: String(engagementRate ?? 0),
        conversions: conversions ?? 0,
        periodDays: periodDays ?? 30,
      })
      .returning();

    return Response.json(playbook, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
