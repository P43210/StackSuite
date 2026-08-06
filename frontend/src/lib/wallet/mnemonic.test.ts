import { describe, expect, it } from "vitest";
import {
  generateNewMnemonic,
  isValidMnemonic,
  mnemonicToSeed,
  seedToRootKey,
} from "./mnemonic";
import { mnemonicToEntropy, entropyToMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

// Official BIP-39 test vector, from Trezor's canonical vectors.json
// (github.com/trezor/python-mnemonic/blob/master/vectors.json), cross-
// confirmed against the same values in tiny-bip39's Rust test suite and
// the BIP-39 spec explainer at bitclawd.com. This is the standard
// reference vector used across the industry - if this doesn't match
// exactly, nothing built on top of it can be trusted.
const OFFICIAL_VECTOR = {
  entropyHex: "00000000000000000000000000000000",
  mnemonic:
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
  passphrase: "TREZOR",
  seedHex:
    "c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04",
  xprv:
    "xprv9s21ZrQH143K3h3fDYiay8mocZ3afhfULfb5GX8kCBdno77K4HiA15Tg23wpbeF1pLfs1c5SPmYHrEpTuuRhxMwvKDwqdKiGJS9XFKzUsAF",
};

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("official BIP-39 test vector verification", () => {
  it("produces the exact official mnemonic from the all-zero entropy vector", () => {
    const entropy = hexToBytes(OFFICIAL_VECTOR.entropyHex);
    const mnemonic = entropyToMnemonic(entropy, wordlist);
    expect(mnemonic).toBe(OFFICIAL_VECTOR.mnemonic);
  });

  it("round-trips the official mnemonic back to the exact original entropy", () => {
    const entropy = mnemonicToEntropy(OFFICIAL_VECTOR.mnemonic, wordlist);
    expect(bytesToHex(entropy)).toBe(OFFICIAL_VECTOR.entropyHex);
  });

  it("derives the exact official 64-byte seed, byte for byte, with the TREZOR passphrase", () => {
    const seed = mnemonicToSeed(OFFICIAL_VECTOR.mnemonic, OFFICIAL_VECTOR.passphrase);
    expect(bytesToHex(seed)).toBe(OFFICIAL_VECTOR.seedHex);
  });

  it("derives the exact official BIP-32 master extended private key from that seed", () => {
    const seed = mnemonicToSeed(OFFICIAL_VECTOR.mnemonic, OFFICIAL_VECTOR.passphrase);
    const root = seedToRootKey(seed);
    expect(root.privateExtendedKey).toBe(OFFICIAL_VECTOR.xprv);
  });

  it("produces a different seed with no passphrase than with the TREZOR passphrase", () => {
    const seedWithPassphrase = mnemonicToSeed(
      OFFICIAL_VECTOR.mnemonic,
      OFFICIAL_VECTOR.passphrase,
    );
    const seedWithoutPassphrase = mnemonicToSeed(OFFICIAL_VECTOR.mnemonic, "");
    expect(bytesToHex(seedWithPassphrase)).not.toBe(bytesToHex(seedWithoutPassphrase));
  });
});

describe("generateNewMnemonic", () => {
  it("generates a mnemonic that passes validation", () => {
    const mnemonic = generateNewMnemonic(128);
    expect(isValidMnemonic(mnemonic)).toBe(true);
    expect(mnemonic.split(" ")).toHaveLength(12);
  });

  it("generates a 24-word mnemonic at 256-bit strength", () => {
    const mnemonic = generateNewMnemonic(256);
    expect(mnemonic.split(" ")).toHaveLength(24);
    expect(isValidMnemonic(mnemonic)).toBe(true);
  });

  it("never generates the same mnemonic twice across many attempts", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      seen.add(generateNewMnemonic(128));
    }
    expect(seen.size).toBe(50);
  });
});

describe("isValidMnemonic", () => {
  it("accepts the official valid mnemonic", () => {
    expect(isValidMnemonic(OFFICIAL_VECTOR.mnemonic)).toBe(true);
  });

  it("rejects a mnemonic with a tampered final word (bad checksum)", () => {
    const tampered = OFFICIAL_VECTOR.mnemonic.replace(/about$/, "zoo");
    expect(isValidMnemonic(tampered)).toBe(false);
  });

  it("rejects a mnemonic containing a word not in the wordlist", () => {
    const invalid = OFFICIAL_VECTOR.mnemonic.replace("abandon", "notaword");
    expect(isValidMnemonic(invalid)).toBe(false);
  });

  it("rejects a mnemonic with the wrong number of words", () => {
    expect(isValidMnemonic("abandon abandon abandon")).toBe(false);
  });

  it("is case-insensitive and tolerant of surrounding whitespace", () => {
    const shouted = `  ${OFFICIAL_VECTOR.mnemonic.toUpperCase()}  `;
    expect(isValidMnemonic(shouted)).toBe(true);
  });
});
