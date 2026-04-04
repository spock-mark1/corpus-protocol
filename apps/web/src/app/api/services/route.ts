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

    let results = services.map((s) => ({
      ...s,
      price: Number(s.price),
    }));

    // Filter by category if provided
    if (category) {
      const lowerCat = category.toLowerCase();
      results = results.filter(
        (s) =>
          s.serviceName.toLowerCase().includes(lowerCat) ||
          (s.description ?? "").toLowerCase().includes(lowerCat) ||
          s.corpusCategory.toLowerCase().includes(lowerCat)
      );
    }

    // Filter by target if provided
    if (target) {
      const lowerTarget = target.toLowerCase();
      results = results.filter(
        (s) =>
          (s.description ?? "").toLowerCase().includes(lowerTarget) ||
          s.corpusName.toLowerCase().includes(lowerTarget)
      );
    }

    return Response.json(results);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
