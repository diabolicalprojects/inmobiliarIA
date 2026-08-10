import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    AUTH_URL: process.env.AUTH_URL,
    OPENWA_BASE_URL: process.env.OPENWA_BASE_URL,
    baseUrlEval: process.env.NEXTAUTH_URL || process.env.AUTH_URL || "https://agentesia.diabolicalservices.tech"
  });
}
