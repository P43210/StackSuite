import { JsonRpcProvider, Wallet, parseUnits, isAddress } from "ethers";
import { ETH_SEND_NETWORK, ethereumRpcUrl, ethereumChainId, isMainnet } from "./network-config";

export interface EthereumSendParams {
  privateKey: string; // 0x-prefixed hex
  recipient: string;
  amountWei: bigint;
}

export interface EthereumSendResult {
  txHash: string;
  network: "mainnet" | "testnet";
  explorerUrl: string;
}

function getProvider(): JsonRpcProvider {
  return new JsonRpcProvider(ethereumRpcUrl(ETH_SEND_NETWORK), ethereumChainId(ETH_SEND_NETWORK));
}

/**
 * Sends ETH using live EIP-1559 fee data from the connected RPC (never
 * hardcoded) and the wallet's current on-chain nonce (never trusted
 * from a cached value - a stale nonce is the classic way an ETH send
 * gets stuck or silently replaces an unrelated pending tx).
 */
export async function sendEthereum(params: EthereumSendParams): Promise<EthereumSendResult> {
  if (!isAddress(params.recipient)) {
    throw new Error("That doesn't look like a valid Ethereum address.");
  }
  if (params.amountWei <= 0n) {
    throw new Error("Amount must be greater than zero.");
  }

  const provider = getProvider();
  const wallet = new Wallet(params.privateKey, provider);

  const balance = await provider.getBalance(wallet.address);
  const feeData = await provider.getFeeData();
  if (!feeData.maxFeePerGas || !feeData.maxPriorityFeePerGas) {
    throw new Error("RPC did not return EIP-1559 fee data - this network/endpoint may not support it.");
  }

  // Standard ETH transfer is exactly 21000 gas.
  const gasLimit = 21_000n;
  const worstCaseFee = feeData.maxFeePerGas * gasLimit;

  if (balance < params.amountWei + worstCaseFee) {
    throw new Error(
      `Insufficient balance: need ${params.amountWei + worstCaseFee} wei (amount + max possible fee), have ${balance} wei.`,
    );
  }

  const nonce = await provider.getTransactionCount(wallet.address, "pending");

  const tx = await wallet.sendTransaction({
    to: params.recipient,
    value: params.amountWei,
    gasLimit,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    nonce,
    chainId: ethereumChainId(ETH_SEND_NETWORK),
    type: 2,
  });

  const explorerBase = isMainnet(ETH_SEND_NETWORK)
    ? "https://etherscan.io/tx"
    : "https://sepolia.etherscan.io/tx";

  return { txHash: tx.hash, network: ETH_SEND_NETWORK, explorerUrl: `${explorerBase}/${tx.hash}` };
}

export async function pollEthereumTransaction(
  txHash: string,
): Promise<"pending" | "confirmed" | "failed" | "not_found"> {
  const provider = getProvider();
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) return "pending"; // could also be not_found; provider doesn't distinguish cheaply
  return receipt.status === 1 ? "confirmed" : "failed";
}

export function ethToWei(eth: string): bigint {
  return parseUnits(eth, 18);
}
