import { Router } from "express";
import { config } from "../config";
import { getRedis } from "../db/redis";
import { extractStxTransfers, notifyStxTransfer } from "../lib/notify";

export const chainhooksRouter = Router();

// Hiro Chainhooks call this endpoint with an Authorization header matching
// the auth-header value set when the predicate was registered. Reject
// anything that doesn't match so this can't be spoofed by a random caller.
chainhooksRouter.post("/chainhooks/events", async (req, res) => {
  if (config.chainhookSharedSecret) {
    const authHeader = req.header("authorization") ?? "";
    if (authHeader !== config.chainhookSharedSecret) {
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  const applyBlocks = Array.isArray(req.body?.apply) ? req.body.apply : [];
  const transfers = extractStxTransfers(applyBlocks);

  const redis = getRedis();
  let notified = 0;

  if (redis && transfers.length > 0) {
    for (const transfer of transfers) {
      try {
        notified += await notifyStxTransfer(redis, transfer);
      } catch (err) {
        console.error("[chainhooks] failed to notify for transfer", err);
      }
    }
  }

  console.log(
    `[chainhooks] received ${applyBlocks.length} apply block(s), ${transfers.length} transfer(s), ${notified} notification(s) queued`,
  );

  res.status(200).json({
    received: applyBlocks.length,
    transfers: transfers.length,
    notified,
  });
});
