import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Always run dynamically

export async function POST(request: NextRequest) {
  // Input data
  /*
    {
      "sourceAddress": "0x00000000...."
      "beneficiary": "0x00000000...."
    }

  */
  const { sourceAddress, beneficiaryAddress } = await request.json();
  // TODO: Lookup address
  return NextResponse.json({
    sourceBanned: true,
    beneficiaryBanned: true,
  });
}
