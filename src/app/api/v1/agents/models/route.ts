import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type OpenAIModel = { id: string };
type GoogleModel = { name: string };

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");
  const apiKey = searchParams.get("apiKey");

  if (!provider || !apiKey) {
    return NextResponse.json({ error: "Faltan parámetros: provider o apiKey" }, { status: 400 });
  }

  try {
    let models: string[] = [];

    if (provider === "OPENAI") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });
      if (!res.ok) {
        throw new Error("API Key de OpenAI inválida");
      }
      const data = await res.json();
      // Filter for gpt models, o1, etc, sort alphabetically
      models = data.data
        .filter((m: OpenAIModel) => m.id.startsWith("gpt-") || m.id.startsWith("o1") || m.id.startsWith("o3"))
        .map((m: OpenAIModel) => m.id)
        .sort();
    } else if (provider === "ANTHROPIC") {
      // Anthropic does not have a public list models API endpoint yet, so we return a static curated list
      // But we can test if the key is valid by making a dummy request, or just return the list.
      // We will assume the key is valid for now if they are just querying models.
      models = [
        "claude-3-7-sonnet-20250219",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-sonnet-20240620",
        "claude-3-5-haiku-20241022",
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307",
      ];
    } else if (provider === "GOOGLE") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) {
        throw new Error("API Key de Google inválida");
      }
      const data = await res.json();
      models = data.models
        .filter((m: GoogleModel) => m.name.includes("gemini"))
        .map((m: GoogleModel) => m.name.replace("models/", ""))
        .sort();
    } else {
      return NextResponse.json({ error: "Proveedor no soportado" }, { status: 400 });
    }

    return NextResponse.json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cargar modelos";
    console.error("Error cargando modelos:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
