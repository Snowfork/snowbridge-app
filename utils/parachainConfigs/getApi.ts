import { ApiPromise, HttpProvider, WsProvider } from "@polkadot/api";

/** Attempts to establish an API connection with a _Substrate_ blockchain node using the provided URL `wsUrl`.
 *
 * If the initial connection is successful, returns a ready to use `ApiPromise` instance; otherwise returns `undefined`.
 *
 * If the WebSocket turns unavailable after the initial connection, it will persistently retry to connect.
 *
 * @param wsUrl HTTP or WS endpoint of a _Substrate_ blockchain node.
 * @returns the api `ApiPromise` if connection was established or `undefined` otherwise.
 */
export async function getSubstApi(
  wsUrl: string,
): Promise<ApiPromise | undefined> {
  const provider = wsUrl.startsWith("http")
    ? new HttpProvider(wsUrl)
    : new WsProvider(wsUrl);
  try {
    // // #1 Variant
    // const api = await ApiPromise.create({
    //   provider,
    //   throwOnConnect: true,
    // });

    // return api;

    // #2 Variant
    const api = new ApiPromise({
      provider,
    });

    return await api.isReadyOrError;
  } catch (error) {
    console.error(
      `Could not connect to API under ${wsUrl}. Because: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
    );

    // stop from trying to reconnect to the webSocket
    provider.disconnect();
    return undefined;
  }
}

import { AbstractProvider, JsonRpcProvider, WebSocketProvider } from "ethers";

/**
 * Attempts to establish a connection with an _Ethereum_ node using the provided URL `nodeUrl`.
 *
 * If the initial connection is successful, it returns a ready to use "provider" API instance.
 *
 * When passing a HTTP endpoint:
 * If the connection attempt fails, the function returns `undefined`.
 *
 * Sadly, when passing a WebSocket endpoint:
 * If the connection attempt fails, an error will be thrown asynchronously, crashing the app.
 *
 * @param nodeUrl - The HTTP or WebSocket endpoint of an Ethereum node.
 * @returns A promise that resolves to a provider instance if the connection is established, or `undefined` if the connection attempt fails.
 */
export async function getEtherApi(
  nodeUrl: string,
): Promise<AbstractProvider | undefined> {
  const provider = nodeUrl.startsWith("http")
    ? new JsonRpcProvider(nodeUrl)
    : new WebSocketProvider(nodeUrl, undefined, { polling: true });

  try {
    // Verify the connection is successful by making a basic request
    await provider.getBlockNumber();

    return provider;
  } catch (err) {
    console.error(
      `Could not connect to Ethereum node at ${nodeUrl}. Reason: ${err instanceof Error ? err.message : JSON.stringify(err)}`,
    );
    provider.destroy();
    return undefined;
  }
}
