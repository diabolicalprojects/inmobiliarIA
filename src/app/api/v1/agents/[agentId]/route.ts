import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";

export async function GET(
  req: Request,
  { params }: { params: { agentId: string } }
) {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const agent = await prisma.agent.findFirst({
    where: { id: params.agentId, agencyId: session.user.agencyId },
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
  llmProvider: z.enum(["OPENAI", "ANTHROPIC", "GOOGLE"]).optional(),
  llmApiKey: z.string().nullable().optional(),
  llmModel: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { agentId: string } }
) {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = updateSchema.parse(body);

    const agent = await prisma.agent.updateMany({
      where: { id: params.agentId, agencyId: session.user.agencyId },
      data: validated,
    });

    if (agent.count === 0) {
      return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });
    }

    const updated = await prisma.agent.findUnique({ where: { id: params.agentId }});
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
  { params }: { params: { agentId: string } }
) {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const agent = await prisma.agent.deleteMany({
    where: { id: params.agentId, agencyId: session.user.agencyId },
  });

  if (agent.count === 0) {
    return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
