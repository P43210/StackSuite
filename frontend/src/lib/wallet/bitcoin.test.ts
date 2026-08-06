import { describe, expect, it } from "vitest";
import { mnemonicToSeed, seedToRootKey } from "./mnemonic";
import { deriveBitcoinAccount } from "./bitcoin";

// Official SLIP-0132 test vector (SatoshiLabs, slips.readthedocs.io),
// standard 12-word test mnemonic with NO passphrase, at the BIP-84
// native SegWit path m/84'/0'/0'/0/0. Matches the same mnemonic used
// in mnemonic.test.ts (without the TREZOR passphrase this time).
const TEST_MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const EXPECTED_ADDRESS = "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu";

describe("deriveBitcoinAccount", () => {
  it("derives the exact official native SegWit address for the standard test mnemonic", () => {
    const seed = mnemonicToSeed(TEST_MNEMONIC, "");
    const root = seedToRootKey(seed);
    const account = deriveBitcoinAccount(root);
    expect(account.address).toBe(EXPECTED_ADDRESS);
  });

  it("is deterministic - the same mnemonic always derives the same address", () => {
    const seed = mnemonicToSeed(TEST_MNEMONIC, "");
    const account1 = deriveBitcoinAccount(seedToRootKey(seed));
    const account2 = deriveBitcoinAccount(seedToRootKey(seed));
    expect(account1.address).toBe(account2.address);
    expect(account1.privateKey).toEqual(account2.privateKey);
  });

  it("produces a different address for a different mnemonic", () => {
    const seedA = mnemonicToSeed(TEST_MNEMONIC, "");
    const seedB = mnemonicToSeed(
      "legal winner thank year wave sausage worth useful legal winner thank yellow",
      "",
    );
    const accountA = deriveBitcoinAccount(seedToRootKey(seedA));
    const accountB = deriveBitcoinAccount(seedToRootKey(seedB));
    expect(accountA.address).not.toBe(accountB.address);
  });

  it("produces a bech32 native SegWit address (starts with bc1)", () => {
    const seed = mnemonicToSeed(TEST_MNEMONIC, "");
    const account = deriveBitcoinAccount(seedToRootKey(seed));
    expect(account.address.startsWith("bc1")).toBe(true);
  });
});
