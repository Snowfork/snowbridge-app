import { NextRequest, NextResponse } from "next/server";
import { checkOFAC } from "./util";

export const dynamic = "force-dynamic"; // Always run dynamically

export async function POST(request: NextRequest) {
  const { sourceAddress, beneficiaryAddress } = await request.json();
  const sourceBanned = await checkOFAC(sourceAddress);
  const beneficiaryBanned = await checkOFAC(beneficiaryAddress);
  return NextResponse.json({
    sourceBanned: sourceBanned,
    beneficiaryBanned: beneficiaryBanned,
  });
}
