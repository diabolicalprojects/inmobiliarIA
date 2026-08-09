import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Seeding database...");

  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@inmobiliarialuna.com" }
  });

  if (existingAdmin) {
    console.log("✅ Database already seeded. Skipping...");
    return;
  }

  // ─── Create Agencies ──────────────────────────────

  const realEstateAgency = await prisma.agency.create({
    data: {
      name: "Inmobiliaria Luna",
      industryType: "REAL_ESTATE",
      llmProvider: "OPENAI",
      llmModel: "gpt-4o-mini",
      aiSystemPrompt: `Eres el asistente virtual de Inmobiliaria Luna, una agencia inmobiliaria premium en Monterrey, México.

Tu objetivo es:
1. Entender las necesidades del cliente (tipo de propiedad, presupuesto, ubicación, características).
2. Presentar las propiedades disponibles que mejor se ajusten.
3. Agendar citas de visita cuando el cliente esté interesado.
4. Responder sobre precios, ubicaciones, amenidades y financiamiento.

Sé profesional, amable y siempre sugiere opciones concretas del catálogo.`,
    },
  });

  const travelAgency = await prisma.agency.create({
    data: {
      name: "Viajes Paraíso",
      industryType: "TRAVEL",
      llmProvider: "OPENAI",
      llmModel: "gpt-4o-mini",
      aiSystemPrompt: `Eres el asistente virtual de Viajes Paraíso, una agencia de viajes especializada en experiencias únicas.

Tu objetivo es:
1. Entender las preferencias del viajero (destino, fechas, presupuesto, tipo de experiencia).
2. Presentar los paquetes disponibles que mejor se ajusten.
3. Dar información sobre itinerarios, hospedaje y actividades.
4. Facilitar la reservación cuando el cliente esté decidido.

Sé entusiasta, genera emoción por los destinos y personaliza cada recomendación.`,
    },
  });

  // ─── Create Admin Users ───────────────────────────

  const passwordHash = await bcrypt.hash("admin123", 12);

  await prisma.user.create({
    data: {
      email: "admin@inmobiliarialuna.com",
      name: "Admin Luna",
      passwordHash,
      role: "AGENCY_ADMIN",
      agencyId: realEstateAgency.id,
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@viajesparaiso.com",
      name: "Admin Paraíso",
      passwordHash,
      role: "AGENCY_ADMIN",
      agencyId: travelAgency.id,
    },
  });

  // Super admin (no agency)
  await prisma.user.create({
    data: {
      email: "superadmin@agentesia.com",
      name: "Super Admin",
      passwordHash: await bcrypt.hash("superadmin123", 12),
      role: "SUPER_ADMIN",
      agencyId: null,
    },
  });

  // ─── Create Mock Catalog Items (Real Estate) ─────

  const realEstateItems = [
    {
      agencyId: realEstateAgency.id,
      title: "Casa Residencial en Valle Oriente",
      description:
        "Hermosa casa de 3 recámaras con acabados de lujo, cocina integral de granito, jardín amplio y estacionamiento para 2 autos. Fraccionamiento con seguridad 24/7, alberca y área de juegos.",
      price: 4500000,
      location: "Valle Oriente, San Pedro Garza García, NL",
      metadata: {
        bedrooms: "3",
        bathrooms: "2.5",
        area_m2: "220",
        type: "Casa",
        amenities: "Alberca, Gimnasio, Seguridad 24/7",
      },
    },
    {
      agencyId: realEstateAgency.id,
      title: "Departamento de Lujo en Santa Fe",
      description:
        "Departamento en piso 18 con vista panorámica a la ciudad. 2 recámaras, sala-comedor amplia, balcón terraza, acabados premium. Torre con amenidades completas: roof garden, gym, business center.",
      price: 3200000,
      location: "Santa Fe, Ciudad de México",
      metadata: {
        bedrooms: "2",
        bathrooms: "2",
        area_m2: "130",
        type: "Departamento",
        floor: "18",
        amenities: "Roof Garden, Gimnasio, Business Center, Concierge",
      },
    },
    {
      agencyId: realEstateAgency.id,
      title: "Terreno en Zona Esmeralda",
      description:
        "Terreno premium de 500 m² en el exclusivo desarrollo Bosque Esmeralda. Plano, con servicios subterráneos, listo para construir. Acceso controlado, áreas verdes y lago artificial.",
      price: 2800000,
      location: "Zona Esmeralda, Atizapán, Estado de México",
      metadata: {
        area_m2: "500",
        type: "Terreno",
        services: "Agua, Luz, Drenaje, Gas Natural",
      },
    },
    {
      agencyId: realEstateAgency.id,
      title: "Penthouse Exclusivo Polanco",
      description:
        "Penthouse de 4 recámaras en la zona más exclusiva de Polanco. Terraza de 80 m², jacuzzi privado, sala de cine, bodega de vinos. Edificio boutique con solo 8 residencias.",
      price: 12500000,
      location: "Polanco, Ciudad de México",
      metadata: {
        bedrooms: "4",
        bathrooms: "4.5",
        area_m2: "380",
        terrace_m2: "80",
        type: "Penthouse",
        amenities: "Jacuzzi, Sala de Cine, Bodega de Vinos, Concierge VIP",
      },
    },
    {
      agencyId: realEstateAgency.id,
      title: "Casa en Fraccionamiento Lomas Country",
      description:
        "Casa familiar de 4 recámaras con amplio jardín, asador y palapa. Cocina equipada, cuarto de servicio, estudio. Fraccionamiento con club deportivo, canchas de tenis y senderos.",
      price: 5800000,
      location: "Lomas Country, Huixquilucan, Estado de México",
      metadata: {
        bedrooms: "4",
        bathrooms: "3",
        area_m2: "310",
        type: "Casa",
        parking: "3",
        amenities: "Club Deportivo, Canchas de Tenis, Senderos, Seguridad",
      },
    },
  ];

  // ─── Create Mock Catalog Items (Travel) ───────────

  const travelItems = [
    {
      agencyId: travelAgency.id,
      title: "Riviera Maya All-Inclusive — 5 Noches",
      description:
        "Paquete todo incluido en resort 5 estrellas en la Riviera Maya. Incluye vuelo redondo, traslados, habitación vista al mar, alimentos y bebidas ilimitadas, acceso a parque temático y snorkeling.",
      price: 28500,
      location: "Riviera Maya, Quintana Roo, México",
      metadata: {
        nights: "5",
        hotel_stars: "5",
        includes: "Vuelo, Traslados, All-Inclusive, Snorkeling, Parque Temático",
        departure_cities: "CDMX, Monterrey, Guadalajara",
      },
    },
    {
      agencyId: travelAgency.id,
      title: "Europa Clásica — 12 Días",
      description:
        "Tour por París, Ámsterdam, Berlín y Roma. Incluye vuelos, hospedaje 4 estrellas, desayunos, traslados entre ciudades en tren de alta velocidad, y tours guiados en cada destino.",
      price: 65000,
      location: "París, Ámsterdam, Berlín, Roma",
      metadata: {
        days: "12",
        countries: "Francia, Países Bajos, Alemania, Italia",
        includes: "Vuelos, Hospedaje 4★, Desayunos, Trenes, Tours Guiados",
        type: "Tour Grupal",
      },
    },
    {
      agencyId: travelAgency.id,
      title: "Cancún Romántico — Parejas",
      description:
        "Escapada romántica de 4 noches en hotel boutique adults-only en la zona hotelera de Cancún. Cena gourmet en la playa, spa para parejas, paseo en catamarán al atardecer y tour a Isla Mujeres.",
      price: 22000,
      location: "Cancún, Quintana Roo, México",
      metadata: {
        nights: "4",
        type: "Romántico / Parejas",
        includes: "Hospedaje Boutique, Cena en Playa, Spa, Catamarán, Isla Mujeres",
        adults_only: "true",
      },
    },
    {
      agencyId: travelAgency.id,
      title: "Aventura en Patagonia — 8 Días",
      description:
        "Expedición a la Patagonia argentina y chilena. Trekking en Torres del Paine, navegación por glaciares, avistamiento de fauna y noches en lodges ecológicos con vista a los Andes.",
      price: 85000,
      location: "Patagonia, Argentina y Chile",
      metadata: {
        days: "8",
        type: "Aventura / Ecoturismo",
        difficulty: "Moderada",
        includes: "Vuelos, Lodges Ecológicos, Trekking, Navegación, Guías",
        best_season: "Octubre - Marzo",
      },
    },
    {
      agencyId: travelAgency.id,
      title: "Japón Cultural — 10 Días",
      description:
        "Inmersión cultural en Japón: Tokio, Kioto, Osaka y Hiroshima. Visita a templos, ceremonia del té, taller de sushi, tren bala, noche en ryokan tradicional y exploración de Akihabara.",
      price: 78000,
      location: "Tokio, Kioto, Osaka, Hiroshima, Japón",
      metadata: {
        days: "10",
        type: "Cultural",
        includes: "Vuelos, Hospedaje Mixto (Hotel + Ryokan), JR Pass, Tours, Experiencias",
        language_support: "Guía en español",
      },
    },
  ];

  await prisma.catalogItem.createMany({
    data: [...realEstateItems, ...travelItems],
  });

  // ─── Create Mock Leads ────────────────────────────

  const lead1 = await prisma.lead.create({
    data: {
      agencyId: realEstateAgency.id,
      phoneNumber: "5215551234567",
      name: "Carlos Mendoza",
      aiSummary:
        "Busca casa de 3-4 recámaras en zona sur de la ciudad. Presupuesto: 4-6 MDP. Interesado en fraccionamientos con seguridad.",
      isQualified: true,
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      agencyId: travelAgency.id,
      phoneNumber: "5215559876543",
      name: "María García",
      aiSummary:
        "Quiere un viaje romántico para aniversario. Presupuesto: 25-30k por persona. Prefiere playa. Fechas: diciembre.",
    },
  });

  // ─── Create Mock Messages ─────────────────────────

  await prisma.messageHistory.createMany({
    data: [
      {
        leadId: lead1.id,
        role: "USER",
        content: "Hola, estoy buscando una casa en Monterrey",
        createdAt: new Date("2026-08-07T10:00:00Z"),
      },
      {
        leadId: lead1.id,
        role: "ASSISTANT",
        content:
          "¡Hola Carlos! 👋 Bienvenido a Inmobiliaria Luna. Me da gusto ayudarte. ¿Podrías contarme un poco más sobre lo que buscas? Por ejemplo:\n\n• ¿Cuántas recámaras necesitas?\n• ¿Tienes alguna zona preferida en Monterrey?\n• ¿Cuál es tu presupuesto aproximado?",
        createdAt: new Date("2026-08-07T10:00:05Z"),
      },
      {
        leadId: lead1.id,
        role: "USER",
        content:
          "Busco 3 o 4 recámaras, zona sur, mi presupuesto es de 4 a 6 millones",
        createdAt: new Date("2026-08-07T10:01:00Z"),
      },
      {
        leadId: lead1.id,
        role: "ASSISTANT",
        content:
          "¡Excelente! Tengo opciones perfectas para ti. Te recomiendo especialmente:\n\n🏠 **Casa en Lomas Country** — 4 recámaras, jardín amplio, club deportivo. $5,800,000 MXN.\n\n🏠 **Casa en Valle Oriente** — 3 recámaras, acabados de lujo, seguridad 24/7. $4,500,000 MXN.\n\n¿Te gustaría agendar una visita a alguna de estas propiedades?",
        createdAt: new Date("2026-08-07T10:01:08Z"),
      },
      {
        leadId: lead2.id,
        role: "USER",
        content: "Hola! Quiero un viaje romántico para mi aniversario en diciembre",
        createdAt: new Date("2026-08-08T14:00:00Z"),
      },
      {
        leadId: lead2.id,
        role: "ASSISTANT",
        content:
          "¡Hola María! 🎉 ¡Felicidades por su aniversario! Tengo opciones increíbles para una escapada romántica:\n\n💕 **Cancún Romántico** — 4 noches en hotel boutique adults-only. Cena en la playa, spa para parejas y paseo en catamarán. $22,000 por persona.\n\n🌴 **Riviera Maya All-Inclusive** — 5 noches en resort 5★ con todo incluido y vista al mar. $28,500 por persona.\n\n¿Cuál te llama más la atención? 😊",
        createdAt: new Date("2026-08-08T14:00:07Z"),
      },
    ],
  });

  console.log("✅ Seed completed!");
  console.log("📧 Users created:");
  console.log("   - admin@inmobiliarialuna.com / admin123 (Real Estate)");
  console.log("   - admin@viajesparaiso.com / admin123 (Travel)");
  console.log("   - superadmin@agentesia.com / superadmin123 (Super Admin)");
  console.log(`🏢 Agencies: ${realEstateAgency.name}, ${travelAgency.name}`);
  console.log(`📦 Catalog: ${realEstateItems.length + travelItems.length} items`);
  console.log(`👤 Leads: 2 mock leads with message history`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
