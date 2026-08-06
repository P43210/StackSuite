import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
  assertPasswordStrength,
  WeakPasswordError,
} from "./password";

describe("assertPasswordStrength", () => {
  it("rejects passwords shorter than the minimum length", () => {
    expect(() => assertPasswordStrength("short")).toThrow(WeakPasswordError);
  });

  it("accepts a password meeting the minimum length", () => {
    expect(() => assertPasswordStrength("longenough1")).not.toThrow();
  });
});

describe("hashPassword / verifyPassword", () => {
  it("produces a hash that verifies against the original password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    const result = await verifyPassword("correct-horse-battery-staple", hash);
    expect(result).toBe(true);
  });

  it("rejects an incorrect password against a real hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    const result = await verifyPassword("wrong-password", hash);
    expect(result).toBe(false);
  });

  it("never stores the password in plaintext form", async () => {
    const password = "correct-horse-battery-staple";
    const hash = await hashPassword(password);
    expect(hash).not.toContain(password);
  });

  it("produces a different hash each time even for the same password", async () => {
    const hash1 = await hashPassword("same-password-123");
    const hash2 = await hashPassword("same-password-123");
    // bcrypt salts randomly, so two hashes of the same password must differ,
    // even though both still verify correctly.
    expect(hash1).not.toBe(hash2);
    expect(await verifyPassword("same-password-123", hash1)).toBe(true);
    expect(await verifyPassword("same-password-123", hash2)).toBe(true);
  });

  it("rejects weak passwords before ever hashing them", async () => {
    await expect(hashPassword("1234567")).rejects.toThrow(WeakPasswordError);
  });
});
