import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOpenWAClient } from "@/lib/openwa";
import logger from "@/lib/utils/logger";

// POST /api/v1/whatsapp/connect — Start a session and get QR code
export async function POST() {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const agencyId = session.user.agencyId;
  const sessionName = `agency-${agencyId}-${crypto.randomUUID().substring(0, 8)}`;

  try {
    // We no longer block if there's an active session, since we support multiple.
    // However, if there are pending sessions, it's fine, we just create a new one.
    
    // Call OpenWA to start session
    const openwa = getOpenWAClient();
    const result = await openwa.startSession(sessionName);

    // Create a new session record
    const waSession = await prisma.whatsappSession.create({
      data: {
        agencyId,
        openwaSessionName: sessionName,
        status: "PENDING",
        qrCodeBase64: result.qrCodeBase64 || null,
      },
    });

    logger.info(`Session started for agency ${agencyId}`, "WhatsApp", {
      sessionName,
    });

    return NextResponse.json({
      sessionId: waSession.id,
      sessionName: waSession.openwaSessionName,
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
      { error: "Error al iniciar sesión de WhatsApp" },
      { status: 500 }
    );
  }
}
