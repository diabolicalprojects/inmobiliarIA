import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/v1/leads — List leads for the authenticated agency
export async function GET() {
  const session = await auth();

  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const leads = await prisma.lead.findMany({
    where: { agencyId: session.user.agencyId },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: { messages: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ leads });
}
