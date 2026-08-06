import { HDKey } from "@scure/bip32";
import { deriveAccount, deriveSalt, DerivationType, getStxAddress } from "@stacks/wallet-sdk";

export interface StacksAccount {
  address: string;
  privateKey: string;
}

/**
 * Uses Hiro's own official wallet-sdk for derivation - the same library
 * Leather wallet is built on - rather than hand-rolling the Stacks-
 * specific derivation scheme, so addresses are guaranteed compatible
 * with the rest of the Stacks wallet ecosystem.
 */
export async function deriveStacksAccount(
  rootKey: HDKey,
  network: "mainnet" | "testnet" = "mainnet",
): Promise<StacksAccount> {
  const salt = await deriveSalt(rootKey);
  const account = deriveAccount({
    rootNode: rootKey,
    index: 0,
    salt,
    stxDerivationType: DerivationType.Wallet,
  });

  const address = getStxAddress({ account, network });

  return { address, privateKey: account.stxPrivateKey };
}
