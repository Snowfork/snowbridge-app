/*
  JSON serialization that handles bigints and dates
*/

export const stringify = <T>(object: T) =>
  JSON.stringify(
    object,
    (_, value) => {
      if (typeof value === "bigint") {
        return `bigint:${value.toString()}`;
      }
      return value;
    },
    2,
  );

export const parse = <T>(object: string) =>
  JSON.parse(object, (_, value) => {
    if (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    ) {
      return new Date(value);
    }
    if (typeof value === "string" && /^bigint:\d+$/.test(value)) {
      return BigInt(value.slice(7));
    }
    return value;
  }) as T;
