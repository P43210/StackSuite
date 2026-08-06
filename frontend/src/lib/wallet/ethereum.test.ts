import { describe, expect, it } from "vitest";
import { HDNodeWallet } from "ethers";
import { mnemonicToSeed, seedToRootKey } from "./mnemonic";
import { deriveEthereumAccount } from "./ethereum";

const TEST_MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const ETH_PATH = "m/44'/60'/0'/0/0";

describe("deriveEthereumAccount", () => {
  it("matches ethers' own independent BIP-39/BIP-32 implementation exactly", () => {
    const ours = deriveEthereumAccount(seedToRootKey(mnemonicToSeed(TEST_MNEMONIC, "")));
    const ethersOwn = HDNodeWallet.fromPhrase(TEST_MNEMONIC, "", ETH_PATH);

    expect(ours.address.toLowerCase()).toBe(ethersOwn.address.toLowerCase());
    expect(ours.address).toBe(ethersOwn.address); // exact case match (EIP-55 checksum)
    expect(ours.privateKey).toBe(ethersOwn.privateKey);
  });

  it("produces a well-formed checksummed address", () => {
    const account = deriveEthereumAccount(seedToRootKey(mnemonicToSeed(TEST_MNEMONIC, "")));
    expect(account.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(account.address).not.toBe(account.address.toLowerCase());
  });

  it("is deterministic", () => {
    const seed = mnemonicToSeed(TEST_MNEMONIC, "");
    const account1 = deriveEthereumAccount(seedToRootKey(seed));
    const account2 = deriveEthereumAccount(seedToRootKey(seed));
    expect(account1.address).toBe(account2.address);
    expect(account1.privateKey).toBe(account2.privateKey);
  });

  it("produces a different address for a different mnemonic", () => {
    const seedA = mnemonicToSeed(TEST_MNEMONIC, "");
    const seedB = mnemonicToSeed(
      "legal winner thank year wave sausage worth useful legal winner thank yellow",
      "",
    );
    const accountA = deriveEthereumAccount(seedToRootKey(seedA));
    const accountB = deriveEthereumAccount(seedToRootKey(seedB));
    expect(accountA.address).not.toBe(accountB.address);
  });
});
