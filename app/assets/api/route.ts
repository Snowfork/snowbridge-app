import { stringify } from "@/lib/json";
import { assetRegistryAsString } from "@/lib/server/assets";
import { getErrorMessage } from "@/lib/snowbridge";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const assets = await assetRegistryAsString();
    if (assets === null) {
      return NextResponse.json(
        { error: "Asset Registry is empty." },
        { status: 500 },
      );
    }
    return new Response(assets, {
      status: 200,
      headers: [["Content-Type", "application/json"]],
    });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
