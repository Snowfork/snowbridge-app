/**
 * Turns `object` into a printable and human readable sting.
 *
 * It handles all JSON compatible types and BigInts.
 *
 * @param object
 * @returns string representation of the object.
 */
export function printify(object: object) {
  return JSON.stringify(
    object,
    (_, v) => (typeof v === "bigint" ? v.toString() : v), // replacer of bigInts
    2,
  );
}
