import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { z } from "zod/v4";

const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  agencyName: z.string().min(2, "El nombre de la agencia es requerido"),
  industryType: z.enum(["REAL_ESTATE", "TRAVEL"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 }
      );
    }

    // Create agency + admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({
        data: {
          name: validated.agencyName,
          industryType: validated.industryType,
          aiSystemPrompt: getDefaultPrompt(validated.industryType),
        },
      });

      const passwordHash = await bcrypt.hash(validated.password, 12);

      const user = await tx.user.create({
        data: {
          email: validated.email,
          name: validated.name,
          passwordHash,
          role: "AGENCY_ADMIN",
          agencyId: agency.id,
        },
      });

      return { user, agency };
    });

    return NextResponse.json(
      {
        message: "Cuenta creada exitosamente",
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          agencyId: result.agency.id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }

    console.error("[Register] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

function getDefaultPrompt(industryType: string): string {
  if (industryType === "REAL_ESTATE") {
    return `Eres un agente inmobiliario virtual profesional y amable. Tu objetivo es:
1. Entender las necesidades del cliente (tipo de propiedad, presupuesto, ubicación, características).
2. Presentar las propiedades disponibles que mejor se ajusten a sus requisitos.
3. Agendar citas de visita cuando el cliente esté interesado.
4. Responder preguntas sobre precios, ubicaciones, amenidades y financiamiento.

Sé conversacional pero profesional. Siempre sugiere opciones concretas cuando tengas información del catálogo.`;
  }

  return `Eres un agente de viajes virtual profesional y entusiasta. Tu objetivo es:
1. Entender las preferencias del viajero (destino, fechas, presupuesto, tipo de experiencia).
2. Presentar los paquetes y destinos disponibles que mejor se ajusten.
3. Proporcionar información detallada sobre itinerarios, hospedaje y actividades.
4. Facilitar la reservación cuando el cliente esté decidido.

Sé amigable y genera entusiasmo por los destinos. Siempre ofrece opciones personalizadas.`;
}
