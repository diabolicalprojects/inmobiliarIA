import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/v1/whatsapp/status — Get session status for the agency
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");

  const waSession = await prisma.whatsappSession.findFirst({
    where: {
      agencyId: session.user.agencyId,
      ...(sessionId ? { id: sessionId } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!waSession) {
    return NextResponse.json({
      status: "NO_SESSION",
      message: "No hay sesión de WhatsApp configurada",
    });
  }

  return NextResponse.json({
    sessionId: waSession.id,
    sessionName: waSession.openwaSessionName,
    status: waSession.status,
    qrCode: waSession.status === "PENDING" ? waSession.qrCodeBase64 : null,
    connectedAt: waSession.connectedAt,
  });
}
