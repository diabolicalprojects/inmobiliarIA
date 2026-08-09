import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Save to the database in a debug table or just log it
    // Wait, we can just save it as a fake lead or message so I can view it!
    console.log("DEBUG WEBHOOK", JSON.stringify(payload, null, 2));
    
    // Let's create a lead just to store the JSON string in the name!
    await prisma.lead.create({
      data: {
        agencyId: "ag-diabolical", // we'll just skip DB, wait, it's easier to use a file
      }
    });

  } catch (e) {
  }
  return NextResponse.json({ ok: true });
}
