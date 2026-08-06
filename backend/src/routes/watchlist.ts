import { Router } from "express";
import { getPool } from "../db/pool";

export const watchlistRouter = Router();

const STX_PRINCIPAL_PATTERN = /^S[PT][0-9A-Z]{38,39}$/;
const VALID_ASSET_CLASSES = new Set(["crypto", "forex", "commodity"]);

watchlistRouter.get("/api/watchlist/:address", async (req, res) => {
  const { address } = req.params;
  if (!STX_PRINCIPAL_PATTERN.test(address)) {
    return res.status(400).json({ error: "invalid Stacks address" });
  }
  const pool = getPool();
  if (!pool) return res.status(503).json({ error: "database unavailable" });

  const result = await pool.query(
    `SELECT id, asset_class, symbol, display_name, added_at
     FROM watchlist_items WHERE stacks_address = $1 ORDER BY added_at ASC`,
    [address],
  );
  res.json({ items: result.rows });
});

watchlistRouter.post("/api/watchlist", async (req, res) => {
  const { address, assetClass, symbol, displayName } = req.body ?? {};

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

  const pool = getPool();
  if (!pool) return res.status(503).json({ error: "database unavailable" });

  try {
    const result = await pool.query(
      `INSERT INTO watchlist_items (stacks_address, asset_class, symbol, display_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (stacks_address, asset_class, symbol) DO NOTHING
       RETURNING id, asset_class, symbol, display_name, added_at`,
      [address, assetClass, symbol, displayName],
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: "already on watchlist" });
    }
    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    console.error("[watchlist] insert failed", err);
    res.status(500).json({ error: "internal error" });
  }
});

watchlistRouter.delete("/api/watchlist/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "invalid id" });
  }
  const pool = getPool();
  if (!pool) return res.status(503).json({ error: "database unavailable" });

  const result = await pool.query(`DELETE FROM watchlist_items WHERE id = $1`, [id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "not found" });
  }
  res.status(204).send();
});
