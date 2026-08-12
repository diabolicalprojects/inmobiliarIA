import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import prisma from "@/lib/prisma";
import logger from "@/lib/utils/logger";

/**
 * Convierte un texto a vector usando OpenAI text-embedding-3-small
 * Nota: Asume que se usará OpenAI para embeddings de manera global,
 * o se le pasa la API key de la agencia si aplica.
 */
export async function generateEmbedding(text: string, apiKey?: string) {
  const key = apiKey || process.env.GLOBAL_LLM_API_KEY;
  if (!key) throw new Error("No API Key available for embeddings");
  
  const openai = createOpenAI({ apiKey: key });
  
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: text,
  });

  return embedding;
}

/**
 * Realiza una búsqueda vectorial en el catálogo de la agencia
 */
export async function searchCatalogSemantic(agencyId: string, query: string, apiKey?: string, limit = 3) {
  try {
    const queryEmbedding = await generateEmbedding(query, apiKey);
    const vectorStr = `[${queryEmbedding.join(",")}]`;

    // Buscar usando pgvector
    const items = await prisma.$queryRaw`
      SELECT id, title, description, price, location,
             1 - (embedding <=> ${vectorStr}::vector) as similarity
      FROM catalog_items
      WHERE "agency_id" = ${agencyId}
        AND "is_active" = true
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${limit};
    `;

    return items as Array<{
      id: string;
      title: string;
      description: string;
      price: any;
      location: string;
      similarity: number;
    }>;
  } catch (error) {
    logger.error(`Semantic search error: ${error}`, "RAG");
    return [];
  }
}
