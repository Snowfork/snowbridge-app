// Derive the app URL from the actual runtime origin so wallet / dApp metadata
// (WalletConnect, Polkadot wallet dialog) is correct wherever the app is served
// - the IPFS custom domain, a gateway, or localhost - instead of the old
// Vercel-injected env vars (which are undefined off Vercel and left the URL
// pointing at localhost).
const url =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://app.snowbridge.network";

export const metadata = {
  title: "Snowbridge",
  description: "The Ethereum Polkadot bridge.",
  icon: `${url}/icon.svg`,
  url,
};
