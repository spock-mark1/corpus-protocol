import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAgentApiKey } from "@/lib/auth";

// PATCH /api/corpus/:id/status — Agent status update (online/offline)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await verifyAgentApiKey(request, id);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { agentOnline } = body;

    if (typeof agentOnline !== "boolean") {
      return Response.json(
        { error: "agentOnline must be a boolean" },
        { status: 400 }
      );
    }

    const updated = await prisma.corpus.update({
      where: { id },
      data: {
        agentOnline,
        agentLastSeen: new Date(),
      },
    });

    return Response.json({
      id: updated.id,
      agentOnline: updated.agentOnline,
      agentLastSeen: updated.agentLastSeen,
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
