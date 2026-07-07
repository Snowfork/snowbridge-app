import { compareToReference } from "@/lib/preimageReference";
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
