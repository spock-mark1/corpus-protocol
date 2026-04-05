import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppCommerceServices } from "@/db/schema";
import { and, desc, eq, ilike, lt, ne, or, sql } from "drizzle-orm";

// GET /api/services — Discover available services across all Corpuses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category");
    const selfId = searchParams.get("self");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 100);

    const conditions = [];

    // Exclude the requesting corpus's own services
    if (selfId) {
      conditions.push(ne(cppCommerceServices.corpusId, selfId));
    }

    // Filter by corpus category (case-insensitive match in DB)
    if (category) {
      conditions.push(ilike(cppCorpus.category, category));
    }

    // Cursor condition (createdAt DESC with id tiebreaker)
    if (cursor) {
      const [cursorDate, cursorId] = cursor.split("|");
      if (cursorDate && cursorId) {
        conditions.push(
          or(
            lt(cppCommerceServices.createdAt, new Date(cursorDate)),
            and(
              eq(cppCommerceServices.createdAt, new Date(cursorDate)),
              lt(cppCommerceServices.id, cursorId),
            ),
          )!,
        );
      }
    }

    const services = await db
      .select({
        id: cppCommerceServices.id,
        corpusId: cppCommerceServices.corpusId,
        corpusName: cppCorpus.name,
        corpusCategory: cppCorpus.category,
        serviceName: cppCommerceServices.serviceName,
        description: cppCommerceServices.description,
        price: cppCommerceServices.price,
        currency: cppCommerceServices.currency,
        chains: cppCommerceServices.chains,
        createdAt: cppCommerceServices.createdAt,
      })
      .from(cppCommerceServices)
      .innerJoin(cppCorpus, eq(cppCommerceServices.corpusId, cppCorpus.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(cppCommerceServices.createdAt), desc(cppCommerceServices.id))
      .limit(limit + 1);

    const hasMore = services.length > limit;
    const page = hasMore ? services.slice(0, limit) : services;

    let results = page.map((s) => ({
      corpusId: s.corpusId,
      corpusName: s.corpusName,
      corpusCategory: s.corpusCategory,
      serviceName: s.serviceName,
      description: s.description,
      price: Number(s.price),
      currency: s.currency,
      chains: s.chains,
    }));

    // Shuffle for diversity — agents see different services each cycle
    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [results[i], results[j]] = [results[j], results[i]];
    }

    const lastItem = page[page.length - 1];
    const nextCursor = hasMore && lastItem
      ? `${lastItem.createdAt.toISOString()}|${lastItem.id}`
      : null;

    return Response.json({ data: results, nextCursor });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
