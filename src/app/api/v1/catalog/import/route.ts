import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Papa from "papaparse";

interface CSVRow {
  title?: string;
  titulo?: string;
  description?: string;
  descripcion?: string;
  price?: string;
  precio?: string;
  location?: string;
  ubicacion?: string;
  [key: string]: string | undefined;
}

// POST /api/v1/catalog/import — Import catalog items from CSV
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó un archivo CSV" },
        { status: 400 }
      );
    }

    const text = await file.text();

    // Parse CSV
    const { data, errors } = Papa.parse<CSVRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Error al parsear el CSV",
          details: errors.slice(0, 5),
        },
        { status: 400 }
      );
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: "El CSV está vacío" },
        { status: 400 }
      );
    }

    // Map CSV rows to catalog items (support Spanish and English column names)
    const items = data
      .map((row) => {
        const title = row.title || row.titulo || "";
        const description = row.description || row.descripcion || "";

        if (!title || !description) return null;

        // Collect remaining columns as metadata
        const knownKeys = [
          "title", "titulo", "description", "descripcion",
          "price", "precio", "location", "ubicacion",
        ];
        const metadata: Record<string, string> = {};
        for (const [key, value] of Object.entries(row)) {
          if (!knownKeys.includes(key) && value) {
            metadata[key] = value;
          }
        }

        return {
          agencyId: session.user.agencyId!,
          title,
          description,
          price: parseFloat(row.price || row.precio || "0") || null,
          location: row.location || row.ubicacion || null,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        };
      })
      .filter(Boolean) as Array<{
        agencyId: string;
        title: string;
        description: string;
        price: number | null;
        location: string | null;
        metadata?: Record<string, string>;
      }>;

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron filas válidas. Se requieren columnas 'title' y 'description' (o 'titulo' y 'descripcion')." },
        { status: 400 }
      );
    }

    // Bulk insert
    const result = await prisma.catalogItem.createMany({
      data: items,
    });

    return NextResponse.json({
      message: `${result.count} elementos importados exitosamente`,
      count: result.count,
    });
  } catch (error) {
    console.error("[Catalog Import] Error:", error);
    return NextResponse.json(
      { error: "Error al importar el catálogo" },
      { status: 500 }
    );
  }
}
