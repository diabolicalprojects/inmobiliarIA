import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";

// GET /api/v1/agencies/me — Get the current user's agency
export async function GET() {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const agency = await prisma.agency.findUnique({
    where: { id: session.user.agencyId },
    include: {
      whatsappSessions: {
        select: {
          id: true,
          agentId: true,
          openwaSessionName: true,
          openwaSessionId: true,
          status: true,
          connectedAt: true,
        },
      },
      _count: {
        select: {
          leads: true,
          catalogItems: true,
        },
      },
    },
  });

  if (!agency) {
    return NextResponse.json({ error: "Agencia no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ agency });
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  aiSystemPrompt: z.string().optional(),
  llmProvider: z.enum(["OPENAI", "ANTHROPIC", "GOOGLE"]).optional(),
  llmApiKey: z.string().optional(),
  llmModel: z.string().optional(),
});

// PATCH /api/v1/agencies/me — Update the current agency
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Only agency admins can update
  if (session.user.role !== "AGENCY_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = updateSchema.parse(body);

    const agency = await prisma.agency.update({
      where: { id: session.user.agencyId },
      data: validated,
    });

    return NextResponse.json({ agency });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }
    throw error;
  }
}
