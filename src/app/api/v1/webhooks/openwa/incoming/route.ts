import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOpenWAClient } from "@/lib/openwa";
import logger from "@/lib/utils/logger";
import redis from "@/lib/redis";
import { runAIAgent } from "@/lib/ai";

type IncomingMessageData = {
  from?: string;
  body?: string;
  text?: string;
  content?: string;
  sender?: {
    id?: string;
    pushname?: string;
  };
  _data?: {
    notifyName?: string;
  };
  notifyName?: string;
};

type OpenWAPayload = {
  sessionId?: string;
  session?: string;
  payload?: IncomingMessageData;
  data?: IncomingMessageData;
} & IncomingMessageData;

/**
 * POST /api/v1/webhooks/openwa/incoming
 *
 * Flujo asíncrono con Debounce (Redis):
 * 1. Recibe webhook, guarda mensaje en BD.
 * 2. Intenta adquirir Lock en Redis (solo un proceso duerme).
 * 3. Si no hay Lock, termina silenciosamente (el mensaje ya se guardó y será procesado).
 * 4. Si adquiere Lock, duerme 3s agrupando mensajes.
 * 5. Lee todo el historial, llama al Agente IA (Vercel AI SDK), y responde.
 */
export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as OpenWAPayload;

    const sessionId = payload.sessionId || payload.session;
    const messageData = payload.payload || payload.data || payload;
    const fromNumber = messageData.from || messageData.sender?.id;
    const messageBody = messageData.body || messageData.text || messageData.content;
    const isGroupMessage = fromNumber?.includes("@g.us");

    if (!sessionId || !fromNumber || !messageBody || isGroupMessage) {
      return NextResponse.json({ status: "ignored" });
    }

    const phoneNumber = fromNumber.replace("@c.us", "");

    // Fire & Forget: Procesar en background para no bloquear a OpenWA
    processMessageAsync(sessionId, phoneNumber, messageBody, messageData).catch((err) => {
      logger.error(`Async processor error: ${err}`, "OpenWA-Webhook");
    });

    return NextResponse.json({ status: "queued" });
  } catch (error) {
    logger.error(`Webhook processing failed: ${error}`, "OpenWA-Webhook");
    return NextResponse.json({ status: "error", message: "Processing failed" });
  }
}

async function processMessageAsync(
  sessionId: string,
  phoneNumber: string,
  messageBody: string,
  messageData: IncomingMessageData
) {
  // 1. Encontrar la Agencia y el Agente Activo
  const waSession = await prisma.whatsappSession.findFirst({
    where: {
      OR: [
        { openwaSessionId: sessionId },
        { openwaSessionName: sessionId },
      ],
    },
    include: {
      agency: {
        include: {
          agents: { where: { isActive: true }, take: 1 },
        },
      },
    },
  });

  if (!waSession) return;
  const agency = waSession.agency;
  const activeAgent = agency.agents[0];
  if (!activeAgent) return;

  // 2. Encontrar/Crear Lead
  const lead = await prisma.lead.upsert({
    where: {
      agencyId_phoneNumber: { agencyId: agency.id, phoneNumber },
    },
    update: { updatedAt: new Date() },
    create: {
      agencyId: agency.id,
      phoneNumber,
      name:
        messageData._data?.notifyName ||
        messageData.sender?.pushname ||
        messageData.notifyName ||
        "Lead de WhatsApp",
    },
  });

  // 3. Guardar el mensaje del usuario inmediatamente
  await prisma.messageHistory.create({
    data: {
      leadId: lead.id,
      role: "USER",
      content: messageBody,
    },
  });

  // 4. Redis Debounce Lock (Esperamos 3 segundos por si el usuario manda más mensajes)
  const lockKey = `lead_lock:${lead.id}`;
  
  // NX: Solo si no existe. EX 5: Expira en 5 segundos (por seguridad si falla el del())
  const acquired = await redis.set(lockKey, "processing", "EX", 5, "NX");
  
  if (!acquired) {
    // Otro proceso ya tiene el lock. Nuestro mensaje ya está en BD y el otro proceso lo leerá cuando despierte.
    logger.debug(`Lock denied for lead ${lead.id} (Messages grouped)`, "OpenWA-Webhook");
    return;
  }

  // Dormimos 3 segundos
  await new Promise((resolve) => setTimeout(resolve, 3000));
  
  // Soltamos el lock para futuros mensajes
  await redis.del(lockKey);

  // 5. Compilar contexto (Leer todo lo que llegó mientras dormíamos)
  const recentMessages = await prisma.messageHistory.findMany({
    where: { leadId: lead.id },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  const messageHistory = recentMessages.reverse();

  // Si el último mensaje es del asistente, alguien más o nosotros mismos respondimos. Abortar.
  if (messageHistory[messageHistory.length - 1]?.role === "ASSISTANT") {
    return;
  }

  const messages = messageHistory.map((msg) => ({
    role: msg.role.toLowerCase() as "user" | "assistant",
    content: msg.content,
  }));

  // 6. Llamar al Vercel AI SDK
  const systemPrompt = activeAgent.systemPrompt || "Eres un asistente virtual útil.";
  
  // IMPORTANTE: En el esquema actual limpiamos llmProvider y apiKey de los Agentes,
  // por lo tanto siempre leeremos de la Agencia.
  const aiResponse = await runAIAgent({
    agency: {
      id: agency.id,
      llmProvider: agency.llmProvider,
      llmApiKey: agency.llmApiKey,
      llmModel: agency.llmModel,
    },
    leadId: lead.id,
    systemPrompt,
    messages,
  });

  // 7. Enviar la respuesta vía OpenWA
  try {
    const openwa = getOpenWAClient();
    await openwa.sendText(waSession.openwaSessionId || sessionId, `${phoneNumber}@c.us`, aiResponse);
  } catch (sendError) {
    logger.error(`Failed to send message via OpenWA: ${sendError}`, "OpenWA-Webhook");
  }

  // 8. Guardar la respuesta de la IA en la BD
  await prisma.messageHistory.create({
    data: {
      leadId: lead.id,
      role: "ASSISTANT",
      content: aiResponse,
    },
  });

  logger.info(`Responded to lead ${lead.id}`, "OpenWA-Webhook");
}
