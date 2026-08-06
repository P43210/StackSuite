import { Router } from "express";
import { config } from "../config";
import { getStxBalance, HiroApiError } from "../lib/hiro-client";

export const stackingRouter = Router();

const STX_PRINCIPAL_PATTERN = /^S[PT][0-9A-Z]{38,39}$/;

const HIRO_BASE_URL =
  config.stacksReadNetwork === "mainnet"
    ? "https://api.hiro.so"
    : "https://api.testnet.hiro.so";

interface PoxInfo {
  current_cycle: { id: number; min_threshold_ustx: number; stacked_ustx: number };
  next_cycle: { id: number; min_threshold_ustx: number };
  reward_cycle_length: number;
  prepare_cycle_length: number;
  first_burnchain_block_height: number;
  current_burnchain_block_height?: number;
}

/**
 * Read-only PoX cycle context - current cycle number, minimum stacking
 * threshold, reward cycle length. Not tied to any one address; the
 * frontend combines this with the per-address lock data below.
 */
stackingRouter.get("/api/stacking/pox-info", async (_req, res) => {
  try {
    const response = await fetch(`${HIRO_BASE_URL}/v2/pox`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return res.status(response.status < 500 ? response.status : 502).json({
        error: `Hiro API returned ${response.status} for /v2/pox`,
      });
    }
    const pox = (await response.json()) as PoxInfo;
    res.json({
      currentCycle: pox.current_cycle.id,
      minThresholdMicroStx: String(pox.current_cycle.min_threshold_ustx),
      totalStackedMicroStx: String(pox.current_cycle.stacked_ustx),
      nextCycle: pox.next_cycle.id,
      nextCycleMinThresholdMicroStx: String(pox.next_cycle.min_threshold_ustx),
      rewardCycleLength: pox.reward_cycle_length,
      prepareCycleLength: pox.prepare_cycle_length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[stacking] pox-info error", err);
    res.status(502).json({ error: "could not reach Hiro API" });
  }
});

/**
 * Per-address stacking status. Reuses the same STX balance data Portfolio
 * already fetches (locked amount, lock height, burnchain unlock height) -
 * a non-zero locked balance means the address currently has STX locked
 * via PoX, whether stacking solo or through a pool.
 */
stackingRouter.get("/api/stacking/status/:address", async (req, res) => {
  const { address } = req.params;
  if (!STX_PRINCIPAL_PATTERN.test(address)) {
    return res.status(400).json({ error: "invalid Stacks address" });
  }

  try {
    const stx = await getStxBalance(address);
    const isStacking = BigInt(stx.locked) > 0n;
    res.json({
      address,
      isStacking,
      lockedMicroStx: stx.locked,
      lockHeight: stx.lock_height,
      burnchainUnlockHeight: stx.burnchain_unlock_height,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof HiroApiError) {
      const status = err.status && err.status < 500 ? err.status : 502;
      return res.status(status).json({ error: err.message });
    }
    console.error("[stacking] status error", err);
    res.status(500).json({ error: "internal error" });
  }
});
