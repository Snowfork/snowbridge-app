import { getEnvironmentName } from "./snowbridge";

let url = "http://localhost:3000";
if (process.env.NEXT_PUBLIC_VERCEL_ENV === "preview") {
  url = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
}
if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
  let subdomain = "app";
  const name = getEnvironmentName();
  switch (name) {
    case "rococo_sepolia":
      subdomain = "rococo-app";
      break;
    case "polkadot_mainnet":
      subdomain = "app";
      break;
    case "paseo_sepolia":
      subdomain = "paseo-app";
      break;
    case "westend_sepolia":
      subdomain = "westend-app";
      break;
  }
  url = `https://${subdomain}.snowbridge.network`;
}

export const metadata = {
  title: "Snowbridge",
  description: "The Ethereum Polkadot bridge.",
  icon: `${url}/icon.svg`,
  url,
};
