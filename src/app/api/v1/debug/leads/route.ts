import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        messages: {
          take: 1
        }
      }
    });
    
    return NextResponse.json(leads);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
