import { NextResponse } from "next/server";

/** Item from https://dashboard.snowbridge.network/api/volume-by-month */
interface VolumeByMonthItem {
  month: string;
  volumeUsd: number;
}

function jsonResponse(
  success: boolean,
  averageVolumeUsd: number | null,
  data: VolumeByMonthItem[] | null,
  error?: string,
  status = 200,
) {
  return NextResponse.json(
    {
      success,
      averageVolumeUsd,
      ...(data && { data }),
      ...(error && { error }),
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers":
          "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
      },
    },
  );
}

export async function GET() {
  const useMock =
    process.env.SNOWBRIDGE_DEV_MODE === "1" ||
    process.env.NEXT_PUBLIC_SNOWBRIDGE_DEV_MODE === "1";
  if (useMock) {
    const mockData: VolumeByMonthItem[] = [
      { month: "2026-03", volumeUsd: 4423026.123924852 },
      { month: "2026-02", volumeUsd: 13459447.843114162 },
      { month: "2026-01", volumeUsd: 14611274.251309982 },
      { month: "2025-12", volumeUsd: 19127551.025540836 },
      { month: "2025-11", volumeUsd: 29238223.309292432 },
      { month: "2025-10", volumeUsd: 72656098.04322074 },
      { month: "2025-09", volumeUsd: 16278191.820128093 },
      { month: "2025-08", volumeUsd: 13932263.737793302 },
      { month: "2025-07", volumeUsd: 46485838.72863063 },
      { month: "2025-06", volumeUsd: 8215194.338636207 },
      { month: "2025-05", volumeUsd: 1772780.3196751191 },
      { month: "2025-04", volumeUsd: 2482523.4827975906 },
      { month: "2025-03", volumeUsd: 3558480.523860218 },
    ];
    const sum = mockData.reduce((a, i) => a + i.volumeUsd, 0);
    const averageVolumeUsd = mockData.length ? sum / mockData.length : 0;
    return jsonResponse(true, averageVolumeUsd, mockData);
  }

  try {
    const res = await fetch(
      "https://dashboard.snowbridge.network/api/volume-by-month",
      { next: { revalidate: 300 } },
    );
    if (!res.ok) {
      throw new Error(
        `Dashboard volume-by-month failed: ${res.status} ${res.statusText}`,
      );
    }
    const data = (await res.json()) as VolumeByMonthItem[];
    if (!Array.isArray(data) || data.length === 0) {
      return jsonResponse(true, 0, data);
    }
    const sum = data.reduce((a, i) => a + (i?.volumeUsd ?? 0), 0);
    const averageVolumeUsd = sum / data.length;
    return jsonResponse(true, averageVolumeUsd, data);
  } catch (error) {
    console.error("Volume-by-month API error:", error);
    return jsonResponse(
      false,
      null,
      null,
      "Failed to fetch monthly volume",
      500,
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers":
        "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
