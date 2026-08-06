import { HDKey } from "@scure/bip32";
import { p2wpkh } from "@scure/btc-signer";

// BIP-84: native SegWit (bech32, bc1...)
const BITCOIN_DERIVATION_PATH = "m/84'/0'/0'/0/0";

export interface BitcoinAccount {
  address: string;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export function deriveBitcoinAccount(rootKey: HDKey): BitcoinAccount {
  const child = rootKey.derive(BITCOIN_DERIVATION_PATH);
  if (!child.publicKey || !child.privateKey) {
    throw new Error("Failed to derive Bitcoin keypair");
  }

  const payment = p2wpkh(child.publicKey);
  if (!payment.address) {
    throw new Error("Failed to derive Bitcoin address");
  }

  return {
    address: payment.address,
    publicKey: child.publicKey,
    privateKey: child.privateKey,
  };
}
