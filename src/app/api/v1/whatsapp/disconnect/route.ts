import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOpenWAClient } from "@/lib/openwa";
import logger from "@/lib/utils/logger";

// POST /api/v1/whatsapp/disconnect — Close the active session
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const agencyId = session.user.agencyId;

  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Falta sessionId" }, { status: 400 });
    }

    const waSession = await prisma.whatsappSession.findFirst({
      where: { id: sessionId, agencyId },
    });

    if (!waSession) {
      return NextResponse.json(
        { error: "No hay sesión activa" },
        { status: 404 }
      );
    }

    // Try to close in OpenWA
    try {
      const openwa = getOpenWAClient();
      await openwa.closeSession(waSession.openwaSessionId || waSession.openwaSessionName);
    } catch (err) {
      logger.warn(
        `OpenWA close failed (session may already be closed): ${err}`,
        "WhatsApp"
      );
    }

    // Update DB status regardless
    await prisma.whatsappSession.update({
      where: { id: waSession.id },
      data: { status: "DISCONNECTED" },
    });

    logger.info(`Session disconnected for agency ${agencyId}`, "WhatsApp");

    return NextResponse.json({ message: "Sesión desconectada" });
  } catch (error) {
    logger.error(`Disconnect error: ${error}`, "WhatsApp", { agencyId });
    return NextResponse.json(
      { error: "Error al desconectar" },
      { status: 500 }
    );
  }
}
