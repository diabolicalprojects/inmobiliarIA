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

  const waSessions = await prisma.whatsappSession.findMany({
    where: {
      agencyId: session.user.agencyId,
      ...(sessionId ? { id: sessionId } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  if (waSessions.length === 0) {
    return NextResponse.json({
      status: "NO_SESSION",
      sessions: [],
    });
  }

  // Actively check OpenWA if any session is still pending
  for (let i = 0; i < waSessions.length; i++) {
    const waSession = waSessions[i];
    const openwaSessionId = waSession.openwaSessionId || waSession.openwaSessionName;

    if (waSession.status === "PENDING" && openwaSessionId) {
      try {
        const openwa = getOpenWAClient();
        const openwaStatus = await openwa.getSessionStatus(openwaSessionId);
        const qrCodeBase64 = waSession.qrCodeBase64 || (await openwa.getQrCode(openwaSessionId));
        
        if (openwaStatus.status === "ready" || openwaStatus.status === "WORKING") {
          waSessions[i] = await prisma.whatsappSession.update({
            where: { id: waSession.id },
            data: {
              status: "CONNECTED",
              connectedAt: new Date(),
              updatedAt: new Date(),
            },
          });
        } else if (qrCodeBase64 && waSession.qrCodeBase64 !== qrCodeBase64) {
          waSessions[i] = await prisma.whatsappSession.update({
            where: { id: waSession.id },
            data: {
              qrCodeBase64,
              updatedAt: new Date(),
            },
          });
        } else if (openwaStatus.status === "unknown") {
          waSessions[i] = await prisma.whatsappSession.update({
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
  }

  return NextResponse.json({
    sessions: waSessions.map(s => ({
      sessionId: s.id,
      sessionName: s.openwaSessionName,
      openwaSessionId: s.openwaSessionId,
      status: s.status,
      qrCode: s.status === "PENDING" ? s.qrCodeBase64 : null,
      connectedAt: s.connectedAt,
    }))
  });
}
