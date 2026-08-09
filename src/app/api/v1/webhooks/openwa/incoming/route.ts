import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOpenWAClient } from "@/lib/openwa";
import logger from "@/lib/utils/logger";

/**
 * POST /api/v1/webhooks/openwa/incoming
 *
 * This is the CRITICAL integration endpoint.
 * OpenWA sends a POST here for every incoming WhatsApp message.
 *
 * Flow:
 * 1. Receive payload → Extract sessionId, from_number, message body
 * 2. Find agency by session_name
 * 3. Find or create Lead by (agency_id + phone_number)
 * 4. Save incoming message as MessageHistory (role: USER)
 * 5. Compile context → [System Prompt] + [Catalog RAG] + [Last 10 msgs]
 * 6. Call LLM → Get response
 * 7. POST to OpenWA /chat/sendText → Send response to lead
 * 8. Save response in MessageHistory (role: ASSISTANT)
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json();

    logger.info("Webhook received", "OpenWA-Webhook", {
      sessionId: payload.sessionId,
      event: payload.event,
    });

    // Extract data from OpenWA payload
    const sessionId = payload.sessionId || payload.session;
    // WAHA puts the actual message in `payload.payload` for `message` events
    const messageData = payload.payload || payload.data || payload;
    const fromNumber = messageData.from || messageData.sender?.id;
    const messageBody = messageData.body || messageData.text || messageData.content;
    const isGroupMessage = fromNumber?.includes("@g.us");

    // Ignore group messages, status updates, and non-text messages
    if (!sessionId || !fromNumber || !messageBody || isGroupMessage) {
      logger.debug("Ignoring non-actionable webhook", "OpenWA-Webhook", {
        sessionId,
        fromNumber,
        hasBody: !!messageBody,
        isGroup: isGroupMessage,
      });
      return NextResponse.json({ status: "ignored" });
    }

    // Normalize phone number (remove @c.us suffix for storage)
    const phoneNumber = fromNumber.replace("@c.us", "");

    // Step 2: Find the agency by sessionId
    const waSession = await prisma.whatsappSession.findFirst({
      where: { openwaSessionName: sessionId },
      include: {
        agency: true,
      },
    });

    if (!waSession) {
      logger.error(`No agency found for session: ${sessionId}`, "OpenWA-Webhook");
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const agency = waSession.agency;

    // Step 3: Find or create the lead
    const lead = await prisma.lead.upsert({
      where: {
        agencyId_phoneNumber: {
          agencyId: agency.id,
          phoneNumber,
        },
      },
      update: {
        updatedAt: new Date(),
      },
      create: {
        agencyId: agency.id,
        phoneNumber,
        name: messageData._data?.notifyName || messageData.sender?.pushname || messageData.notifyName || "Lead de WhatsApp",
      },
    });

    // Step 4: Save the incoming message
    await prisma.messageHistory.create({
      data: {
        leadId: lead.id,
        role: "USER",
        content: messageBody,
      },
    });

    logger.info(`Message saved for lead ${lead.id}`, "OpenWA-Webhook", {
      agencyId: agency.id,
      phone: phoneNumber,
    });

    // Step 5: Compile context for the AI
    const recentMessages = await prisma.messageHistory.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Reverse to chronological order
    const messageHistory = recentMessages.reverse();

    // Build the messages array for the LLM
    const systemPrompt = agency.aiSystemPrompt || "Eres un asistente virtual útil y profesional.";

    // Get catalog items for context (simple text search for now, RAG in Phase 3)
    const catalogItems = await prisma.catalogItem.findMany({
      where: {
        agencyId: agency.id,
        isActive: true,
      },
      take: 5,
    });

    const catalogContext = catalogItems.length > 0
      ? `\n\nCATÁLOGO DISPONIBLE:\n${catalogItems
          .map(
            (item, i) =>
              `${i + 1}. ${item.title} - ${item.description}${item.price ? ` | Precio: $${item.price}` : ""}${item.location ? ` | Ubicación: ${item.location}` : ""}`
          )
          .join("\n")}`
      : "";

    const messages = [
      {
        role: "system" as const,
        content: `${systemPrompt}${catalogContext}\n\nIMPORTANTE: Responde siempre en español. Sé conciso en tus respuestas (máximo 2-3 párrafos cortos). Este es un chat de WhatsApp, así que mantén un tono conversacional.`,
      },
      ...messageHistory.map((msg) => ({
        role: msg.role.toLowerCase() as "user" | "assistant",
        content: msg.content,
      })),
    ];

    // Step 6: Call the LLM
    let aiResponse: string;

    try {
      aiResponse = await callLLM(agency, messages);
    } catch (llmError) {
      logger.error(
        `LLM call failed: ${llmError}`,
        "OpenWA-Webhook",
        { agencyId: agency.id }
      );
      aiResponse = "Lo siento, estoy teniendo dificultades técnicas en este momento. Un agente humano te contactará pronto. 🙏";
    }

    // Step 7: Send response via OpenWA
    try {
      const openwa = getOpenWAClient();
      await openwa.sendText(sessionId, fromNumber, aiResponse);
    } catch (sendError) {
      logger.error(
        `Failed to send message via OpenWA: ${sendError}`,
        "OpenWA-Webhook"
      );
      // Still save the response even if send fails
    }

    // Step 8: Save the AI response
    await prisma.messageHistory.create({
      data: {
        leadId: lead.id,
        role: "ASSISTANT",
        content: aiResponse,
      },
    });

    logger.info("Webhook processed successfully", "OpenWA-Webhook", {
      agencyId: agency.id,
      leadId: lead.id,
    });

    return NextResponse.json({ status: "processed" });
  } catch (error) {
    logger.error(
      `Webhook processing failed: ${error instanceof Error ? error.message : "Unknown"}`,
      "OpenWA-Webhook",
      { stack: error instanceof Error ? error.stack : undefined }
    );

    // Always return 200 to prevent OpenWA from retrying
    return NextResponse.json({ status: "error", message: "Processing failed" });
  }
}

/**
 * Call the configured LLM for the agency.
 * Supports OpenAI, Anthropic, and Google.
 */
async function callLLM(
  agency: { llmProvider: string; llmApiKey: string | null; llmModel: string | null },
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const provider = agency.llmProvider;
  const apiKey = agency.llmApiKey;

  if (!apiKey) {
    throw new Error("LLM API key not configured for this agency");
  }

  switch (provider) {
    case "OPENAI":
      return callOpenAI(apiKey, agency.llmModel || "gpt-4o-mini", messages);
    case "ANTHROPIC":
      return callAnthropic(apiKey, agency.llmModel || "claude-sonnet-4-20250514", messages);
    case "GOOGLE":
      return callGoogle(apiKey, agency.llmModel || "gemini-2.0-flash", messages);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

async function callOpenAI(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "No pude generar una respuesta.";
}

async function callAnthropic(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  // Separate system message from conversation
  const systemMessage = messages.find((m) => m.role === "system")?.content || "";
  const conversationMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system: systemMessage,
      messages: conversationMessages,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.content[0]?.text || "No pude generar una respuesta.";
}

async function callGoogle(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const systemMessage = messages.find((m) => m.role === "system")?.content || "";
  const conversationMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemMessage }] },
        contents: conversationMessages,
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google AI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "No pude generar una respuesta."
  );
}
