import { HDKey } from "@scure/bip32";
import { Wallet } from "ethers";

// BIP-44 standard Ethereum path
const ETHEREUM_DERIVATION_PATH = "m/44'/60'/0'/0/0";

export interface EthereumAccount {
  address: string;
  privateKey: string; // 0x-prefixed hex
}

function bytesToHex0x(bytes: Uint8Array): string {
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function deriveEthereumAccount(rootKey: HDKey): EthereumAccount {
  const child = rootKey.derive(ETHEREUM_DERIVATION_PATH);
  if (!child.privateKey) {
    throw new Error("Failed to derive Ethereum private key");
  }

  const privateKeyHex = bytesToHex0x(child.privateKey);
  // ethers computes the Keccak-256 + EIP-55 checksum address from the
  // private key - deliberately not reimplementing that math here.
  const wallet = new Wallet(privateKeyHex);

  return { address: wallet.address, privateKey: privateKeyHex };
}
