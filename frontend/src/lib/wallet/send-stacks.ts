import { makeSTXTokenTransfer, broadcastTransaction } from "@stacks/transactions";
import { STX_SEND_NETWORK, hiroApiBase, isMainnet } from "./network-config";

export interface StxSendParams {
  senderKey: string; // hex private key
  recipient: string; // ST.../SP... principal
  amountMicroStx: bigint;
  memo?: string;
}

export interface StxSendResult {
  txid: string;
  network: "mainnet" | "testnet";
  explorerUrl: string;
}

export type StxTxStatus =
  | { status: "pending" }
  | { status: "success" }
  | { status: "abort_by_response" | "abort_by_post_condition" }
  | { status: "not_found" };

const STX_ADDRESS_PATTERN = /^S[PT][0-9A-Z]{38,39}$/;

/**
 * Fetches the account nonce directly from Hiro rather than trusting a
 * cached/stale value - using the wrong nonce is one of the most common
 * ways a send silently fails or gets stuck.
 */
async function fetchNonce(address: string): Promise<bigint> {
  const res = await fetch(`${hiroApiBase(STX_SEND_NETWORK)}/extended/v1/address/${address}/nonces`);
  if (!res.ok) {
    throw new Error(`Could not fetch nonce for ${address} (Hiro returned ${res.status})`);
  }
  const body = await res.json();
  const nonce = body?.possible_next_nonce;
  if (typeof nonce !== "number") {
    throw new Error("Unexpected nonce response shape from Hiro");
  }
  return BigInt(nonce);
}

/**
 * Builds, signs, and broadcasts an STX transfer. Does NOT confirm the
 * transaction landed - call pollStxTransaction with the returned txid
 * for that. Network is fixed by NEXT_PUBLIC_STACKS_NETWORK (testnet by
 * default) - see network-config.ts.
 */
export async function sendStx(params: StxSendParams): Promise<StxSendResult> {
  if (!STX_ADDRESS_PATTERN.test(params.recipient)) {
    throw new Error("That doesn't look like a valid Stacks address.");
  }
  if (params.amountMicroStx <= 0n) {
    throw new Error("Amount must be greater than zero.");
  }

  const senderAddressPlaceholderNonce = await deriveNonceForKey(params.senderKey);

  const transaction = await makeSTXTokenTransfer({
    recipient: params.recipient,
    amount: params.amountMicroStx,
    senderKey: params.senderKey,
    network: STX_SEND_NETWORK,
    memo: params.memo?.slice(0, 34) ?? "", // Stacks memo field is capped at 34 bytes
    nonce: senderAddressPlaceholderNonce,
  });

  const response = await broadcastTransaction({ transaction, network: STX_SEND_NETWORK });

  if ("error" in response && response.error) {
    throw new Error(
      `Broadcast rejected: ${response.error}${
        "reason" in response && response.reason ? ` (${response.reason})` : ""
      }`,
    );
  }

  const txid = (response as { txid: string }).txid;
  const explorerNetworkParam = isMainnet(STX_SEND_NETWORK) ? "" : "?chain=testnet";
  return {
    txid,
    network: STX_SEND_NETWORK,
    explorerUrl: `https://explorer.hiro.so/txid/${txid}${explorerNetworkParam}`,
  };
}

// makeSTXTokenTransfer needs the nonce up front; deriving the address
// from the key here keeps sendStx's public signature simple (callers
// pass a key, not an address they have to keep in sync with it).
async function deriveNonceForKey(senderKey: string): Promise<bigint> {
  const { privateKeyToAddress } = await import("@stacks/transactions");
  const address = privateKeyToAddress(senderKey, STX_SEND_NETWORK);
  return fetchNonce(address);
}

/**
 * Polls Hiro for confirmation. Callers should show "pending" in the UI
 * and keep polling (e.g. every 15-30s) rather than blocking - Stacks
 * confirmation can take multiple minutes.
 */
export async function pollStxTransaction(txid: string): Promise<StxTxStatus> {
  const res = await fetch(`${hiroApiBase(STX_SEND_NETWORK)}/extended/v1/tx/${txid}`);
  if (res.status === 404) return { status: "not_found" };
  if (!res.ok) throw new Error(`Could not fetch tx status (Hiro returned ${res.status})`);

  const body = await res.json();
  switch (body.tx_status) {
    case "success":
      return { status: "success" };
    case "pending":
      return { status: "pending" };
    case "abort_by_response":
    case "abort_by_post_condition":
      return { status: body.tx_status };
    default:
      return { status: "pending" };
  }
}
