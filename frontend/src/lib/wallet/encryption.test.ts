import { describe, expect, it } from "vitest";
import { encryptMnemonic, decryptMnemonic, DecryptionError } from "./encryption";

const MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("encryptMnemonic / decryptMnemonic", () => {
  it("round-trips correctly with the right password", async () => {
    const encrypted = await encryptMnemonic(MNEMONIC, "correct horse battery staple");
    const decrypted = await decryptMnemonic(encrypted, "correct horse battery staple");
    expect(decrypted).toBe(MNEMONIC);
  });

  it("never stores the mnemonic in plaintext within the encrypted payload", async () => {
    const encrypted = await encryptMnemonic(MNEMONIC, "a-password");
    expect(encrypted.ciphertext).not.toContain(MNEMONIC);
    expect(JSON.stringify(encrypted)).not.toContain("abandon");
  });

  it("fails to decrypt with the wrong password", async () => {
    const encrypted = await encryptMnemonic(MNEMONIC, "correct-password");
    await expect(decryptMnemonic(encrypted, "wrong-password")).rejects.toThrow(
      DecryptionError,
    );
  });

  it("produces different ciphertext each time even for the same mnemonic and password", async () => {
    const encrypted1 = await encryptMnemonic(MNEMONIC, "same-password");
    const encrypted2 = await encryptMnemonic(MNEMONIC, "same-password");
    expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    expect(encrypted1.salt).not.toBe(encrypted2.salt);
    expect(encrypted1.iv).not.toBe(encrypted2.iv);

    expect(await decryptMnemonic(encrypted1, "same-password")).toBe(MNEMONIC);
    expect(await decryptMnemonic(encrypted2, "same-password")).toBe(MNEMONIC);
  });

  it("rejects tampered ciphertext rather than silently returning garbage", async () => {
    const encrypted = await encryptMnemonic(MNEMONIC, "a-password");
    const tampered = {
      ...encrypted,
      ciphertext: encrypted.ciphertext.slice(0, -4) + "abcd",
    };
    await expect(decryptMnemonic(tampered, "a-password")).rejects.toThrow(DecryptionError);
  });
});
