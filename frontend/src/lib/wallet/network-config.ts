/**
 * Single source of truth for which network each chain's send pipeline
 * talks to. Defaults to testnet everywhere. Deliberately requires an
 * explicit, loud opt-in to point any chain at mainnet - a missing env
 * var should never silently fall through to "real money."
 *
 * DO NOT set any of the *_NETWORK vars below to "mainnet" until you've
 * run a full send/receive/fee-too-low/insufficient-balance/network-down
 * pass on testnet for that specific chain.
 */

export type ChainNetwork = "mainnet" | "testnet";

function readNetwork(envVar: string | undefined): ChainNetwork {
  return envVar === "mainnet" ? "mainnet" : "testnet";
}

export const STX_SEND_NETWORK: ChainNetwork = readNetwork(
  process.env.NEXT_PUBLIC_STACKS_NETWORK,
);

export const BTC_SEND_NETWORK: ChainNetwork = readNetwork(
  process.env.NEXT_PUBLIC_BITCOIN_NETWORK,
);

export const ETH_SEND_NETWORK: ChainNetwork = readNetwork(
  process.env.NEXT_PUBLIC_ETHEREUM_NETWORK,
);

export function hiroApiBase(network: ChainNetwork): string {
  return network === "mainnet" ? "https://api.hiro.so" : "https://api.testnet.hiro.so";
}

export function mempoolApiBase(network: ChainNetwork): string {
  return network === "mainnet" ? "https://mempool.space/api" : "https://mempool.space/testnet/api";
}

/**
 * ETH needs an actual JSON-RPC endpoint (no keyless public node exists
 * the way mempool.space/Hiro are for BTC/STX). Sepolia is the standard
 * testnet. Falls back to a public Sepolia RPC if unset so testnet
 * sending works out of the box; mainnet REQUIRES an explicit RPC URL
 * (no default) so a misconfigured env can't accidentally broadcast to
 * a random/unreliable free endpoint with real ETH.
 */
export function ethereumRpcUrl(network: ChainNetwork): string {
  const configured = process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL;
  if (configured) return configured;
  if (network === "testnet") return "https://ethereum-sepolia-rpc.publicnode.com";
  throw new Error(
    "NEXT_PUBLIC_ETHEREUM_RPC_URL is not set. Mainnet ETH sends require an explicit RPC URL " +
      "(e.g. from Alchemy/Infura) - there is no safe default for real funds.",
  );
}

export function ethereumChainId(network: ChainNetwork): number {
  return network === "mainnet" ? 1 : 11155111; // Sepolia
}

export function isMainnet(network: ChainNetwork): boolean {
  return network === "mainnet";
}
