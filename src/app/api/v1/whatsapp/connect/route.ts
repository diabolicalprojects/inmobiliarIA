import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOpenWAClient } from "@/lib/openwa";
import logger from "@/lib/utils/logger";
import crypto from "crypto";

// POST /api/v1/whatsapp/connect — Start a session and get QR code
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const agencyId = session.user.agencyId;
  const sessionName = `ag-${crypto.randomUUID()}`;

  try {
    // We no longer block if there's an active session, since we support multiple.
    // However, if there are pending sessions, it's fine, we just create a new one.
    
    // Call OpenWA to start session
    const openwa = getOpenWAClient();
    const result = await openwa.startSession(sessionName, req.nextUrl.origin);

    // Create a new session record
    const isConnected = result.status === "ready" || result.status === "WORKING";
    const waSession = await prisma.whatsappSession.create({
      data: {
        agencyId,
        openwaSessionName: sessionName,
        openwaSessionId: result.sessionId,
        status: isConnected ? "CONNECTED" : "PENDING",
        qrCodeBase64: result.qrCodeBase64 || null,
        connectedAt: isConnected ? new Date() : null,
      },
    });

    if (!waSession.qrCodeBase64) {
      const qrCodeBase64 = result.qrCodeBase64 || (await openwa.getQrCode(result.sessionId)) || null;
      if (qrCodeBase64) {
        await prisma.whatsappSession.update({
          where: { id: waSession.id },
          data: { qrCodeBase64 },
        });
        waSession.qrCodeBase64 = qrCodeBase64;
      }
    }

    logger.info(`Session started for agency ${agencyId}`, "WhatsApp", {
      sessionName,
    });

    return NextResponse.json({
      sessionId: waSession.id,
      sessionName: waSession.openwaSessionName,
      openwaSessionId: result.sessionId,
      qrCode: waSession.qrCodeBase64,
      status: waSession.status,
    });
  } catch (error) {
    logger.error(
      `Failed to start session: ${error instanceof Error ? error.message : "Unknown"}`,
      "WhatsApp",
      { agencyId }
    );

    return NextResponse.json(
      { error: "Error al iniciar sesión de WhatsApp", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
