import { describe, expect, it } from "vitest";
import { mnemonicToSeed, seedToRootKey } from "./mnemonic";
import { deriveStacksAccount } from "./stacks";

const TEST_MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

const STX_PRINCIPAL_PATTERN = /^S[PT][0-9A-Z]{38,39}$/;

describe("deriveStacksAccount", () => {
  it("derives a well-formed mainnet address", async () => {
    const root = seedToRootKey(mnemonicToSeed(TEST_MNEMONIC, ""));
    const account = await deriveStacksAccount(root, "mainnet");
    expect(account.address).toMatch(STX_PRINCIPAL_PATTERN);
    expect(account.address.startsWith("SP")).toBe(true);
  });

  it("derives a well-formed testnet address with the same mnemonic", async () => {
    const root = seedToRootKey(mnemonicToSeed(TEST_MNEMONIC, ""));
    const account = await deriveStacksAccount(root, "testnet");
    expect(account.address).toMatch(STX_PRINCIPAL_PATTERN);
    expect(account.address.startsWith("ST")).toBe(true);
  });

  it("is deterministic - same mnemonic always derives the same address", async () => {
    const root1 = seedToRootKey(mnemonicToSeed(TEST_MNEMONIC, ""));
    const root2 = seedToRootKey(mnemonicToSeed(TEST_MNEMONIC, ""));
    const account1 = await deriveStacksAccount(root1, "mainnet");
    const account2 = await deriveStacksAccount(root2, "mainnet");
    expect(account1.address).toBe(account2.address);
    expect(account1.privateKey).toBe(account2.privateKey);
  });

  it("produces a different address for a different mnemonic", async () => {
    const rootA = seedToRootKey(mnemonicToSeed(TEST_MNEMONIC, ""));
    const rootB = seedToRootKey(
      mnemonicToSeed(
        "legal winner thank year wave sausage worth useful legal winner thank yellow",
        "",
      ),
    );
    const accountA = await deriveStacksAccount(rootA, "mainnet");
    const accountB = await deriveStacksAccount(rootB, "mainnet");
    expect(accountA.address).not.toBe(accountB.address);
  });
});
