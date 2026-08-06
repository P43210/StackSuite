export const STACKS_NETWORK = process.env.NEXT_PUBLIC_STACKS_NETWORK ?? "testnet";

// Set after deploying contracts/contracts/escrow.clar, e.g.
// "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG.escrow"
export const ESCROW_CONTRACT = process.env.NEXT_PUBLIC_ESCROW_CONTRACT ?? "";

// Set after deploying contracts/contracts/yield-vault.clar
export const YIELD_VAULT_CONTRACT = process.env.NEXT_PUBLIC_YIELD_VAULT_CONTRACT ?? "";

export function isEscrowContractConfigured(): boolean {
  return ESCROW_CONTRACT.includes(".");
}

export function isYieldVaultConfigured(): boolean {
  return YIELD_VAULT_CONTRACT.includes(".");
}
