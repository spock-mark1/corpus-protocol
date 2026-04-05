import { headers } from "next/headers";
import { ActivityClient } from "./activity-client";

// Always fetch fresh data on every request (no caching)
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = hdrs.get("x-forwarded-proto") ?? "http";
  const res = await fetch(`${protocol}://${host}/api/activity?limit=50`, {
    cache: "no-store",
  });
  const data = await res.json();

  return (
    <ActivityClient
      stats={data.stats}
      transactions={data.transactions}
      initialCursor={data.nextCursor}
    />
  );
}
