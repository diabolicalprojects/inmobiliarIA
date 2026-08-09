import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const leads = await prisma.lead.findMany({
    include: { messages: true },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(leads);
}
