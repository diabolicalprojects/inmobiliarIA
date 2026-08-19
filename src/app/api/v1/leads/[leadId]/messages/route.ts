import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOpenWAClient } from "@/lib/openwa";
import { z } from "zod/v4";

// GET /api/v1/leads/[leadId]/messages — Get message history for a lead
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { leadId } = await params;

  // Verify lead belongs to the agency (multi-tenant isolation)
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      agencyId: session.user.agencyId,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ lead });
}

const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  whatsappSessionId: z.string().uuid().optional(),
});

// POST /api/v1/leads/[leadId]/messages — Send a manual WhatsApp reply
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { leadId } = await params;

  try {
    const body = await req.json();
    const { content, whatsappSessionId } = sendMessageSchema.parse(body);

    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        agencyId: session.user.agencyId,
      },
      include: {
        whatsappSession: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    }

    const waSession = whatsappSessionId
      ? await prisma.whatsappSession.findFirst({
          where: {
            id: whatsappSessionId,
            agencyId: session.user.agencyId,
            status: "CONNECTED",
          },
        })
      : lead.whatsappSession?.status === "CONNECTED"
        ? lead.whatsappSession
        : await prisma.whatsappSession.findFirst({
            where: {
              agencyId: session.user.agencyId,
              status: "CONNECTED",
            },
            orderBy: { connectedAt: "desc" },
          });

    if (!waSession) {
      return NextResponse.json(
        { error: "No hay una sesión de WhatsApp conectada para enviar el mensaje" },
        { status: 409 }
      );
    }

    const openwa = getOpenWAClient();
    await openwa.sendText(
      waSession.openwaSessionId || waSession.openwaSessionName,
      `${lead.phoneNumber}@c.us`,
      content
    );

    const message = await prisma.messageHistory.create({
      data: {
        leadId: lead.id,
        role: "ASSISTANT",
        content,
      },
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        whatsappSessionId: waSession.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }

    console.error("[Messages] Failed to send WhatsApp message", error);
    return NextResponse.json(
      { error: "Error al enviar mensaje de WhatsApp" },
      { status: 500 }
    );
  }
}
