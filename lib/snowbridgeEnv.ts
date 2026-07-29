import { Environment } from "@snowbridge/base-types";
import { bridgeInfoFor } from "@snowbridge/registry";

export function getEnvironmentName() {
  const name = process.env.NEXT_PUBLIC_SNOWBRIDGE_ENV;
  if (!name) throw new Error("NEXT_PUBLIC_SNOWBRIDGE_ENV var not configured.");
  return name;
}

export function getEnvironment() {
  const envName = getEnvironmentName();
  const env: Environment = bridgeInfoFor(envName).environment;

  if (env === undefined)
    throw new Error(
      `NEXT_PUBLIC_SNOWBRIDGE_ENV configured for unknown environment '${envName}'`,
    );
  return env;
}
