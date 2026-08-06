import { Router } from "express";
import {
  getStxBalance,
  getFtBalances,
  getAccountTransactionsPage,
  HiroApiError,
} from "../lib/hiro-client";

export const wrappedRouter = Router();

const STX_PRINCIPAL_PATTERN = /^S[PT][0-9A-Z]{38,39}$/;

function pickTxId(entry: {
  tx?: { tx_id?: string; block_height?: number; burn_block_time_iso?: string };
  tx_id?: string;
  block_height?: number;
  burn_block_time_iso?: string;
}) {
  return {
    txId: entry.tx?.tx_id ?? entry.tx_id ?? null,
    blockHeight: entry.tx?.block_height ?? entry.block_height ?? null,
    timeIso: entry.tx?.burn_block_time_iso ?? entry.burn_block_time_iso ?? null,
  };
}

/**
 * Aggregated, shareable stats for an address: balance, token count, total
 * transaction count, and (best-effort) the oldest confirmed transaction's
 * timestamp/block. Nothing here is written anywhere - purely a read-only
 * composite of data Portfolio already fetches, plus one extra call for
 * transaction history.
 */
wrappedRouter.get("/api/wrapped/:address", async (req, res) => {
  const { address } = req.params;
  if (!STX_PRINCIPAL_PATTERN.test(address)) {
    return res.status(400).json({ error: "invalid Stacks address" });
  }

  try {
    const [stx, ft, firstPage] = await Promise.all([
      getStxBalance(address),
      getFtBalances(address),
      getAccountTransactionsPage(address, 1, 0),
    ]);

    const txCount = firstPage.total ?? 0;
    let oldest: { txId: string | null; blockHeight: number | null; timeIso: string | null } = {
      txId: null,
      blockHeight: null,
      timeIso: null,
    };

    if (txCount > 1) {
      const oldestPage = await getAccountTransactionsPage(address, 1, txCount - 1);
      if (oldestPage.results[0]) oldest = pickTxId(oldestPage.results[0]);
    } else if (txCount === 1 && firstPage.results[0]) {
      oldest = pickTxId(firstPage.results[0]);
    }

    res.json({
      address,
      balanceMicroStx: stx.balance,
      lockedMicroStx: stx.locked,
      isStacking: BigInt(stx.locked) > 0n,
      tokenCount: ft.results.length,
      transactionCount: txCount,
      firstTransaction: oldest,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof HiroApiError) {
      const status = err.status && err.status < 500 ? err.status : 502;
      return res.status(status).json({ error: err.message });
    }
    console.error("[wrapped] error", err);
    res.status(500).json({ error: "internal error" });
  }
});
