import { Router } from "express";
import { cached } from "../lib/cache";
import {
  getBitcoinFees,
  getEthereumGas,
  getStacksFees,
  GasNotConfiguredError,
} from "../lib/gas-client";

export const gasRouter = Router();

gasRouter.get("/api/gas", async (_req, res) => {
  const [bitcoin, ethereum, stacks] = await Promise.allSettled([
    cached("gas:bitcoin", 30, getBitcoinFees),
    cached("gas:ethereum", 30, getEthereumGas),
    cached("gas:stacks", 30, getStacksFees),
  ]);

  function unwrap(result: PromiseSettledResult<unknown>) {
    if (result.status === "fulfilled") return { data: result.value, error: null };
    const err = result.reason;
    if (err instanceof GasNotConfiguredError) {
      return { data: null, error: { configured: false, message: err.message } };
    }
    return {
      data: null,
      error: { configured: true, message: err instanceof Error ? err.message : "unknown error" },
    };
  }

  res.json({
    bitcoin: unwrap(bitcoin),
    ethereum: unwrap(ethereum),
    stacks: unwrap(stacks),
  });
});
