import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOpenWAClient } from "@/lib/openwa";

// GET /api/v1/whatsapp/status — Get session status for the agency
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");

  let waSession = await prisma.whatsappSession.findFirst({
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

  // Actively check WAHA if we think it's still pending
  if (waSession.status === "PENDING" && waSession.openwaSessionName) {
    try {
      const openwa = getOpenWAClient();
      const openwaStatus = await openwa.getSessionStatus(waSession.openwaSessionName);
      
      if (openwaStatus.status === "ready" || openwaStatus.status === "WORKING") {
        waSession = await prisma.whatsappSession.update({
          where: { id: waSession.id },
          data: {
            status: "CONNECTED",
            connectedAt: new Date(),
            updatedAt: new Date(),
          },
        });
      } else if (openwaStatus.status === "unknown") {
        waSession = await prisma.whatsappSession.update({
          where: { id: waSession.id },
          data: {
            status: "DISCONNECTED",
            updatedAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error("[WhatsApp Status] Error checking OpenWA status", error);
    }
  }

  return NextResponse.json({
    sessionId: waSession.id,
    sessionName: waSession.openwaSessionName,
    status: waSession.status,
    qrCode: waSession.status === "PENDING" ? waSession.qrCodeBase64 : null,
    connectedAt: waSession.connectedAt,
  });
}
