import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";

// GET /api/v1/catalog — List catalog items for the agency
export async function GET() {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const items = await prisma.catalogItem.findMany({
    where: { agencyId: session.user.agencyId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive().optional(),
  location: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

// POST /api/v1/catalog — Add a catalog item
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.agencyId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = createSchema.parse(body);

    const item = await prisma.catalogItem.create({
      data: {
        agencyId: session.user.agencyId,
        title: validated.title,
        description: validated.description,
        price: validated.price ?? null,
        location: validated.location ?? null,
        metadata: validated.metadata ? (validated.metadata as Record<string, string>) : undefined,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }
    throw error;
  }
}
