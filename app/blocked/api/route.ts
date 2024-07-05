import { NextRequest, NextResponse } from "next/server";
import { checkOFAC } from "@/lib/ofac";

export const dynamic = "force-dynamic"; // Always run dynamically

export async function POST(request: NextRequest) {
  const { sourceAddress, beneficiaryAddress } = await request.json();
  const apiKey = process.env.CHAINALYSIS_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    const message = "No chainalysis key configured.";
    console.error(message);
    return NextResponse.json(
      { error: message },
      { status: 500, statusText: "No CHAINALYSIS_KEY configured." },
    );
  }
  const sourceBanned = await checkOFAC(sourceAddress, apiKey);
  const beneficiaryBanned = await checkOFAC(beneficiaryAddress, apiKey);
  if (sourceBanned) {
    console.log("banned source address", sourceAddress);
  }
  if (beneficiaryBanned) {
    console.log("banned source address", beneficiaryAddress);
  }
  return NextResponse.json({ sourceBanned, beneficiaryBanned });
}
