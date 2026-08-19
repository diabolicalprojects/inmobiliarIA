import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, agencyId: session.user.agencyId },
    include: {
      whatsappSessions: {
        select: { id: true, status: true, openwaSessionName: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ agent });
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  systemPrompt: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  whatsappSessionId: z.string().uuid().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = updateSchema.parse(body);
    const { whatsappSessionId, ...agentData } = validated;

    const agent = await prisma.agent.updateMany({
      where: { id: agentId, agencyId: session.user.agencyId },
      data: agentData,
    });

    if (agent.count === 0) {
      return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });
    }

    if (whatsappSessionId !== undefined) {
      await prisma.whatsappSession.updateMany({
        where: { agentId, agencyId: session.user.agencyId },
        data: { agentId: null },
      });

      if (whatsappSessionId) {
        const waSession = await prisma.whatsappSession.updateMany({
          where: { id: whatsappSessionId, agencyId: session.user.agencyId },
          data: { agentId },
        });

        if (waSession.count === 0) {
          return NextResponse.json({ error: "Sesión de WhatsApp no encontrada" }, { status: 404 });
        }
      }
    }

    const updated = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        whatsappSessions: {
          select: { id: true, status: true, openwaSessionName: true },
          orderBy: { updatedAt: "desc" },
        },
      },
    });
    return NextResponse.json({ agent: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Error al actualizar agente" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const agent = await prisma.agent.deleteMany({
    where: { id: agentId, agencyId: session.user.agencyId },
  });

  if (agent.count === 0) {
    return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
