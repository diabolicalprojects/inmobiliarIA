import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import prisma from "@/lib/prisma";
import logger from "@/lib/utils/logger";
import { searchCatalogSemantic } from "@/lib/rag";

interface AgencyConfig {
  id: string;
  llmProvider: string;
  llmApiKey: string | null;
  llmModel: string | null;
}

// Definimos el tipo exacto para que tsc resuelva el overload de generateText correctamente
type SDKMessage = Array<{
  role: "user" | "assistant" | "system";
  content: string;
}>;

export async function runAIAgent({
  agency,
  leadId,
  systemPrompt,
  messages,
}: {
  agency: AgencyConfig;
  leadId: string;
  systemPrompt: string;
  messages: SDKMessage;
}): Promise<string> {
  const provider = agency.llmProvider || "OPENAI";
  const apiKey = agency.llmApiKey || process.env.GLOBAL_LLM_API_KEY;

  if (!apiKey) {
    logger.error("No API Key available for AI Agent", "AI", { agencyId: agency.id });
    return "Lo siento, tengo un problema de configuración (Falta API Key).";
  }

  let model: Parameters<typeof generateText>[0]["model"];

  try {
    switch (provider) {
      case "OPENAI": {
        const openai = createOpenAI({ apiKey });
        model = openai(agency.llmModel || "gpt-4o-mini");
        break;
      }
      case "ANTHROPIC": {
        const anthropic = createAnthropic({ apiKey });
        model = anthropic(agency.llmModel || "claude-3-5-sonnet-20240620");
        break;
      }
      case "GOOGLE": {
        const google = createGoogleGenerativeAI({ apiKey });
        model = google(agency.llmModel || "gemini-1.5-flash");
        break;
      }
      default:
        throw new Error(`Proveedor desconocido: ${provider}`);
    }

    const { text } = await generateText({
      model,
      system: `${systemPrompt}\n\nREGLA CRÍTICA: Responde siempre de manera conversacional en formato de WhatsApp (corto, al grano, sin formato markdown excesivo). Eres proactivo. Si un cliente muestra intención real de compra o pide recomendaciones, USA TUS HERRAMIENTAS.`,
      messages,
      maxOutputTokens: 500,
      tools: {
        searchCatalog: {
          description: "Busca en el catálogo de propiedades o viajes para dar recomendaciones precisas al usuario.",
          inputSchema: z.object({
            query: z.string().describe("La búsqueda semántica (ej. 'casa en la playa con 3 cuartos' o 'viaje a europa económico')"),
          }),
          execute: async ({ query }: { query: string }) => {
            try {
              const items = await searchCatalogSemantic(agency.id, query, apiKey, 3);
              
              if (items.length === 0) return "No se encontraron items que coincidan con la búsqueda.";
              
              return JSON.stringify(
                items.map((i) => ({
                  title: i.title,
                  description: i.description,
                  price: i.price,
                  location: i.location,
                  relevance: Math.round(i.similarity * 100) + "%",
                }))
              );
    } catch {
              return "Error buscando en catálogo.";
            }
          },
        },
        qualifyLead: {
          description: "Califica a un lead si ha mostrado interés explícito, presupuesto, y ha proporcionado datos relevantes (nombre/email).",
          inputSchema: z.object({
            isQualified: z.boolean().describe("Si el lead cumple los criterios de calificación"),
            summary: z.string().describe("Un resumen de 1 línea de lo que quiere el lead"),
          }),
          execute: async ({ isQualified, summary }: { isQualified: boolean; summary: string }) => {
            await prisma.lead.update({
              where: { id: leadId },
              data: { isQualified, aiSummary: summary },
            });
            return `Lead actualizado. Calificado: ${isQualified}. Resumen guardado.`;
          },
        },
      },
    });

    return text || "Lo siento, no pude generar una respuesta.";
  } catch (error) {
    logger.error(`AI execution failed: ${error}`, "AI", { agencyId: agency.id, provider });
    return "Tuve un error procesando la respuesta. Un humano te atenderá pronto.";
  }
}
