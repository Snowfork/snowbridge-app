// Client-side fetchers for the Snowbridge dashboard stats. These call
// dashboard.snowbridge.network directly from the browser (the endpoints send
// `Access-Control-Allow-Origin: *`), replacing the former /api/* proxy routes
// so the app can run as a static bundle on IPFS.

const TVL_URL = "https://dashboard.snowbridge.network/api/tvl";
const VOLUME_URL = "https://dashboard.snowbridge.network/api/volume-by-month";

interface SnowbridgeTvlResponse {
  tvlUsd: number;
}

interface VolumeByMonthItem {
  month: string;
  volumeUsd: number;
}

function devMode(): boolean {
  return process.env.NEXT_PUBLIC_SNOWBRIDGE_DEV_MODE === "1";
}

const MOCK_TVL_USD = 56337162.01133176;

const MOCK_VOLUME: VolumeByMonthItem[] = [
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

function average(items: VolumeByMonthItem[]): number {
  if (items.length === 0) return 0;
  const sum = items.reduce((a, i) => a + (i?.volumeUsd ?? 0), 0);
  return sum / items.length;
}

export async function fetchTvlUsd(): Promise<number | null> {
  if (devMode()) return MOCK_TVL_USD;

  const res = await fetch(TVL_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch TVL: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as SnowbridgeTvlResponse;
  return typeof data?.tvlUsd === "number" ? data.tvlUsd : null;
}

export async function fetchAverageMonthlyVolumeUsd(): Promise<number | null> {
  if (devMode()) return average(MOCK_VOLUME);

  const res = await fetch(VOLUME_URL);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch monthly volume: ${res.status} ${res.statusText}`,
    );
  }
  const data = (await res.json()) as VolumeByMonthItem[];
  return Array.isArray(data) ? average(data) : null;
}
