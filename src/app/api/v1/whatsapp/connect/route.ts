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
  const sessionName = `agency-${agencyId}`;

  try {
    // Check if there's already an active session
    const existing = await prisma.whatsappSession.findFirst({
      where: { agencyId, status: "CONNECTED" },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya hay una sesión activa", session: existing },
        { status: 409 }
      );
    }

    // Call OpenWA to start session
    const openwa = getOpenWAClient();
    const result = await openwa.startSession(sessionName);

    // Upsert the session record
    const waSession = await prisma.whatsappSession.upsert({
      where: { openwaSessionName: sessionName },
      update: {
        status: "PENDING",
        qrCodeBase64: result.qrCodeBase64 || null,
        updatedAt: new Date(),
      },
      create: {
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
