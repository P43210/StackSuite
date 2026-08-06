import { Router } from "express";
import { getPool } from "../db/pool";
import { TelegramLink } from "../db/models/TelegramLink";

export const alertsRouter = Router();

const STX_PRINCIPAL_PATTERN = /^S[PT][0-9A-Z]{38,39}$/;
const VALID_ASSET_CLASSES = new Set(["crypto", "forex", "commodity"]);
const VALID_COMPARATORS = new Set(["above", "below"]);

alertsRouter.get("/api/alerts/:address", async (req, res) => {
  const { address } = req.params;
  if (!STX_PRINCIPAL_PATTERN.test(address)) {
    return res.status(400).json({ error: "invalid Stacks address" });
  }
  const pool = getPool();
  if (!pool) return res.status(503).json({ error: "database unavailable" });

  const result = await pool.query(
    `SELECT id, asset_class, symbol, display_name, comparator, target_price,
            triggered, triggered_at, created_at
     FROM price_alerts WHERE stacks_address = $1 ORDER BY created_at DESC`,
    [address],
  );
  res.json({ alerts: result.rows });
});

alertsRouter.post("/api/alerts", async (req, res) => {
  const { address, assetClass, symbol, displayName, comparator, targetPrice } =
    req.body ?? {};

  if (typeof address !== "string" || !STX_PRINCIPAL_PATTERN.test(address)) {
    return res.status(400).json({ error: "invalid Stacks address" });
  }
  if (typeof assetClass !== "string" || !VALID_ASSET_CLASSES.has(assetClass)) {
    return res.status(400).json({ error: "invalid assetClass" });
  }
  if (typeof symbol !== "string" || symbol.trim() === "") {
    return res.status(400).json({ error: "symbol is required" });
  }
  if (typeof displayName !== "string" || displayName.trim() === "") {
    return res.status(400).json({ error: "displayName is required" });
  }
  if (typeof comparator !== "string" || !VALID_COMPARATORS.has(comparator)) {
    return res.status(400).json({ error: "comparator must be 'above' or 'below'" });
  }
  const targetPriceNum = Number(targetPrice);
  if (!Number.isFinite(targetPriceNum) || targetPriceNum <= 0) {
    return res.status(400).json({ error: "targetPrice must be a positive number" });
  }

  const pool = getPool();
  if (!pool) return res.status(503).json({ error: "database unavailable" });

  try {
    const result = await pool.query(
      `INSERT INTO price_alerts
         (stacks_address, asset_class, symbol, display_name, comparator, target_price)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, asset_class, symbol, display_name, comparator, target_price,
                 triggered, triggered_at, created_at`,
      [address, assetClass, symbol, displayName, comparator, targetPriceNum],
    );

    // Auto-subscribe this address to price-alert notifications, same
    // pattern as the stx-transfer subscription created at Telegram link
    // time. This lives on the Mongo TelegramLink document (the same
    // place notify.ts and alert-checker.ts now read subscriptions
    // from), not the old Postgres event_subscriptions table. A no-op if
    // the address isn't linked yet - matchedCount will just be 0, and
    // the alert simply has nowhere to notify until they link.
    await TelegramLink.updateOne(
      { stacksAddress: address },
      { $addToSet: { subscriptions: "price-alert" } },
    );

    res.status(201).json({ alert: result.rows[0] });
  } catch (err) {
    console.error("[alerts] insert failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

alertsRouter.delete("/api/alerts/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "invalid id" });
  }
  const pool = getPool();
  if (!pool) return res.status(503).json({ error: "database unavailable" });

  const result = await pool.query(`DELETE FROM price_alerts WHERE id = $1`, [id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "not found" });
  }
  res.status(204).send();
});
