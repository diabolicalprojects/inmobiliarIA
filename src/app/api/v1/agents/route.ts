import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";

export async function GET() {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const agents = await prisma.agent.findMany({
    where: { agencyId: session.user.agencyId },
    include: {
      whatsappSessions: {
        select: { id: true, status: true, openwaSessionName: true },
        orderBy: { updatedAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ agents });
}

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  whatsappSessionId: z.string().uuid().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = createSchema.parse(body);
    const { whatsappSessionId, ...agentData } = validated;

    if (whatsappSessionId) {
      const waSession = await prisma.whatsappSession.findFirst({
        where: { id: whatsappSessionId, agencyId: session.user.agencyId },
        select: { id: true },
      });

      if (!waSession) {
        return NextResponse.json({ error: "Sesión de WhatsApp no encontrada" }, { status: 404 });
      }
    }

    const agent = await prisma.agent.create({
      data: {
        ...agentData,
        agencyId: session.user.agencyId,
        isActive: true,
      },
    });

    if (whatsappSessionId) {
      await prisma.whatsappSession.update({
        where: { id: whatsappSessionId },
        data: { agentId: agent.id },
      });
    }

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Error al crear agente" }, { status: 500 });
  }
}
