import { compareToReference, parseLastVerified } from "@/lib/preimageReference";
import type { ReferenceFile } from "@/lib/preimageReference";
import { describe, expect, test } from "vitest";

const reference: ReferenceFile = {
  halt: {
    hash: "0xhalt",
    callData: "0xaaaa",
    encodedSize: 2,
  },
  resume: {
    hash: "0xresume",
    callData: "0xbbbb",
    encodedSize: 2,
  },
};

describe("compareToReference", () => {
  test("halt: identical hash and bytes match", () => {
    expect(
      compareToReference(
        "halt",
        { hash: "0xhalt", callData: "0xaaaa" },
        reference,
      ),
    ).toBe("match");
  });

  test("resume: identical hash and bytes match", () => {
    expect(
      compareToReference(
        "resume",
        { hash: "0xresume", callData: "0xbbbb" },
        reference,
      ),
    ).toBe("match");
  });

  test("mismatched hash is a mismatch even if bytes coincide", () => {
    expect(
      compareToReference(
        "halt",
        { hash: "0xwrong", callData: "0xaaaa" },
        reference,
      ),
    ).toBe("mismatch");
  });

  test("mismatched bytes is a mismatch even if hash coincides", () => {
    expect(
      compareToReference(
        "halt",
        { hash: "0xhalt", callData: "0xcccc" },
        reference,
      ),
    ).toBe("mismatch");
  });

  test("comparing a halt against the resume entry mismatches", () => {
    // Guards against an operation/entry mix-up: halt bytes must not pass when
    // the operation says resume.
    expect(
      compareToReference(
        "resume",
        { hash: "0xhalt", callData: "0xaaaa" },
        reference,
      ),
    ).toBe("mismatch");
  });
});

describe("parseLastVerified", () => {
  test("extracts the committer date of the first commit", () => {
    const d = parseLastVerified([
      { commit: { committer: { date: "2026-07-07T12:00:00Z" } } },
    ]);
    expect(d?.toISOString()).toBe("2026-07-07T12:00:00.000Z");
  });

  test("returns null for an empty array", () => {
    expect(parseLastVerified([])).toBeNull();
  });

  test("returns null for a malformed / missing date", () => {
    expect(parseLastVerified([{ commit: { committer: {} } }])).toBeNull();
    expect(
      parseLastVerified([{ commit: { committer: { date: "not-a-date" } } }]),
    ).toBeNull();
  });
});
