import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppCommerceServices } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/services — Discover available services across all Corpuses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category");
    const target = searchParams.get("target");

    const services = await db
      .select({
        corpusId: cppCommerceServices.corpusId,
        corpusName: cppCorpus.name,
        corpusCategory: cppCorpus.category,
        serviceName: cppCommerceServices.serviceName,
        description: cppCommerceServices.description,
        price: cppCommerceServices.price,
        currency: cppCommerceServices.currency,
        chains: cppCommerceServices.chains,
      })
      .from(cppCommerceServices)
      .innerJoin(cppCorpus, eq(cppCommerceServices.corpusId, cppCorpus.id));

    const selfId = searchParams.get("self");

    let results = services.map((s) => ({
      ...s,
      price: Number(s.price),
    }));

    // Exclude the requesting corpus's own services
    if (selfId) {
      results = results.filter((s) => s.corpusId !== selfId);
    }

    // Filter by corpus category (exact match against DB category)
    if (category) {
      results = results.filter(
        (s) => s.corpusCategory.toLowerCase() === category.toLowerCase()
      );
    }

    // Shuffle for diversity — agents see different services each cycle
    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [results[i], results[j]] = [results[j], results[i]];
    }

    return Response.json(results);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
