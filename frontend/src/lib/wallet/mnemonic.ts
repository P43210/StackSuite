import { generateMnemonic, validateMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { HDKey } from "@scure/bip32";

export type MnemonicStrength = 128 | 256; // 128 -> 12 words, 256 -> 24 words

export function generateNewMnemonic(strength: MnemonicStrength = 128): string {
  return generateMnemonic(wordlist, strength);
}

export function isValidMnemonic(mnemonic: string): boolean {
  return validateMnemonic(mnemonic.trim().toLowerCase(), wordlist);
}

/**
 * Derives the 64-byte BIP-39 seed from a mnemonic. This is the single
 * most load-bearing computation in the whole wallet - every chain's
 * keys come from this seed via BIP-32. Verified byte-for-byte against
 * the official BIP-39 test vector (see mnemonic.test.ts).
 */
export function mnemonicToSeed(mnemonic: string, passphrase = ""): Uint8Array {
  return mnemonicToSeedSync(mnemonic.trim().toLowerCase(), passphrase);
}

export function seedToRootKey(seed: Uint8Array): HDKey {
  return HDKey.fromMasterSeed(seed);
}
