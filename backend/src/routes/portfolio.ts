import { Router } from "express";
import { getStxBalance, getFtBalances, HiroApiError } from "../lib/hiro-client";

export const portfolioRouter = Router();

const STX_PRINCIPAL_PATTERN = /^S[PT][0-9A-Z]{38,39}(\.[a-zA-Z][a-zA-Z0-9-]{0,39})?$/;

portfolioRouter.get("/api/portfolio/:address", async (req, res) => {
  const { address } = req.params;

  if (!STX_PRINCIPAL_PATTERN.test(address)) {
    return res.status(400).json({ error: "invalid Stacks address" });
  }

  try {
    const [stx, ft] = await Promise.all([
      getStxBalance(address),
      getFtBalances(address),
    ]);

    res.json({
      address,
      stx: {
        balanceMicroStx: stx.balance,
        lockedMicroStx: stx.locked,
        lockHeight: stx.lock_height,
        burnchainUnlockHeight: stx.burnchain_unlock_height,
      },
      tokens: ft.results.map((entry) => ({
        contract: entry.token,
        balance: entry.balance,
      })),
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof HiroApiError) {
      const status = err.status && err.status < 500 ? err.status : 502;
      return res.status(status).json({ error: err.message });
    }
    console.error("[portfolio] unexpected error", err);
    res.status(500).json({ error: "internal error" });
  }
});
