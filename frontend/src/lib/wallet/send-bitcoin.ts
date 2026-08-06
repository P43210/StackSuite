import * as btc from "@scure/btc-signer";
import { BTC_SEND_NETWORK, mempoolApiBase, isMainnet } from "./network-config";

export interface BitcoinSendParams {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  fromAddress: string;
  recipient: string;
  amountSats: bigint;
  /** sat/vB. Get this from the gas route's Bitcoin fee data - never hardcode. */
  feeRateSatPerVb: number;
}

export interface BitcoinSendResult {
  txid: string;
  network: "mainnet" | "testnet";
  explorerUrl: string;
  feePaidSats: bigint;
}

interface Utxo {
  txid: string;
  vout: number;
  value: number;
  status: { confirmed: boolean };
}

const network = () => (isMainnet(BTC_SEND_NETWORK) ? btc.NETWORK : btc.TEST_NETWORK);

async function fetchUtxos(address: string): Promise<Utxo[]> {
  const res = await fetch(`${mempoolApiBase(BTC_SEND_NETWORK)}/address/${address}/utxo`);
  if (!res.ok) throw new Error(`Could not fetch UTXOs (mempool.space returned ${res.status})`);
  return res.json();
}

// P2WPKH: ~68 vbytes per input, ~31 per output, +10.5 overhead. Standard
// estimate used by most wallets for fee sizing before the tx is final.
function estimateVsize(numInputs: number, numOutputs: number): number {
  return Math.ceil(10.5 + numInputs * 68 + numOutputs * 31);
}

/**
 * Simple largest-first UTXO selection: sorts confirmed UTXOs descending
 * by value and accumulates until input value covers amount + fee.
 * Deliberately NOT using unconfirmed UTXOs - spending unconfirmed
 * inputs risks the whole tx getting orphaned if the parent drops out
 * of the mempool.
 *
 * Largest-first (rather than smallest-first / branch-and-bound) is a
 * conservative choice: it minimizes input count and therefore fee, at
 * the cost of not being optimal for UTXO-set health. Fine for a wallet
 * send flow; a coin-control feature could do better later.
 */
function selectUtxos(
  utxos: Utxo[],
  amountSats: bigint,
  feeRateSatPerVb: number,
): { selected: Utxo[]; fee: bigint; change: bigint } {
  const confirmed = utxos.filter((u) => u.status.confirmed).sort((a, b) => b.value - a.value);

  const selected: Utxo[] = [];
  let total = 0n;

  for (const utxo of confirmed) {
    selected.push(utxo);
    total += BigInt(utxo.value);

    // Two-output estimate first (recipient + change) - if change ends up
    // dust we drop the change output below and this becomes an
    // overestimate, which is the safe direction to be wrong in.
    const feeWithChange = BigInt(Math.ceil(estimateVsize(selected.length, 2) * feeRateSatPerVb));
    if (total >= amountSats + feeWithChange) {
      const change = total - amountSats - feeWithChange;
      // Below ~330 sats a P2WPKH output is uneconomical/dust - fold it
      // into the fee instead of creating an unspendable-in-practice output.
      if (change < 330n) {
        const feeNoChange = BigInt(Math.ceil(estimateVsize(selected.length, 1) * feeRateSatPerVb));
        if (total >= amountSats + feeNoChange) {
          return { selected, fee: total - amountSats, change: 0n };
        }
        continue; // this UTXO set covers the change-having case but not the no-change case; keep adding
      }
      return { selected, fee: feeWithChange, change };
    }
  }

  throw new Error(
    "Insufficient confirmed balance to cover this amount plus the network fee.",
  );
}

export async function sendBitcoin(params: BitcoinSendParams): Promise<BitcoinSendResult> {
  if (params.amountSats <= 0n) throw new Error("Amount must be greater than zero.");
  if (params.feeRateSatPerVb <= 0) throw new Error("Invalid fee rate.");

  const utxos = await fetchUtxos(params.fromAddress);
  if (utxos.length === 0) throw new Error("No spendable (confirmed) UTXOs found for this address.");

  const { selected, fee, change } = selectUtxos(utxos, params.amountSats, params.feeRateSatPerVb);

  const tx = new btc.Transaction();
  const script = btc.p2wpkh(params.publicKey, network()).script;

  for (const utxo of selected) {
    tx.addInput({
      txid: utxo.txid,
      index: utxo.vout,
      witnessUtxo: { amount: BigInt(utxo.value), script },
    });
  }

  tx.addOutputAddress(params.recipient, params.amountSats, network());
  if (change > 0n) {
    tx.addOutputAddress(params.fromAddress, change, network());
  }

  tx.sign(params.privateKey);
  tx.finalize();

  const res = await fetch(`${mempoolApiBase(BTC_SEND_NETWORK)}/tx`, {
    method: "POST",
    body: tx.hex,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Broadcast rejected by mempool.space (${res.status}): ${body}`);
  }
  const txid = await res.text();

  const explorerBase = isMainnet(BTC_SEND_NETWORK)
    ? "https://mempool.space/tx"
    : "https://mempool.space/testnet/tx";

  return { txid: txid.trim(), network: BTC_SEND_NETWORK, explorerUrl: `${explorerBase}/${txid.trim()}`, feePaidSats: fee };
}

export async function pollBitcoinTransaction(txid: string): Promise<"pending" | "confirmed" | "not_found"> {
  const res = await fetch(`${mempoolApiBase(BTC_SEND_NETWORK)}/tx/${txid}`);
  if (res.status === 404) return "not_found";
  if (!res.ok) throw new Error(`Could not fetch tx status (mempool.space returned ${res.status})`);
  const body = await res.json();
  return body?.status?.confirmed ? "confirmed" : "pending";
}
