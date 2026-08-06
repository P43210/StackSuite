import { Router } from "express";
import { config } from "../config";

export const bnsRouter = Router();

const HIRO_BASE_URL =
  config.stacksReadNetwork === "mainnet"
    ? "https://api.hiro.so"
    : "https://api.testnet.hiro.so";

// BNS names look like "name.btc" or "name.stx" - conservative pattern,
// same shape Hiro's own BNS API expects.
const BNS_NAME_PATTERN = /^[a-z0-9_-]{1,37}\.[a-z0-9_-]{1,37}$/i;
const STX_PRINCIPAL_PATTERN = /^S[PT][0-9A-Z]{38,39}$/;

function hiroHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.hiroApiKey) headers["x-hiro-api-key"] = config.hiroApiKey;
  return headers;
}

interface BnsNameInfo {
  address?: string;
  blockchain?: string;
  expire_block?: number;
  grace_period?: number;
  last_txid?: string;
  status?: string;
  zonefile?: string;
  zonefile_hash?: string;
}

/** Resolves a BNS name to its owning address, status, and expiration block. */
bnsRouter.get("/api/bns/resolve/:name", async (req, res) => {
  const { name: rawName } = req.params;
  if (!BNS_NAME_PATTERN.test(rawName)) {
    return res.status(400).json({ error: "invalid BNS name format" });
  }

  // BNS names are stored on-chain in lowercase - Hiro's API is
  // case-sensitive, so "Beebrain.btc" 404s even when "beebrain.btc" is
  // registered. Names read the same to a person regardless of case, so
  // normalize before querying rather than surfacing a false negative.
  const name = rawName.toLowerCase();

  try {
    const response = await fetch(`${HIRO_BASE_URL}/v1/names/${encodeURIComponent(name)}`, {
      headers: hiroHeaders(),
    });
    if (response.status === 404) {
      return res.status(404).json({ error: `${name} is not registered` });
    }
    if (!response.ok) {
      return res
        .status(response.status < 500 ? response.status : 502)
        .json({ error: `Hiro API returned ${response.status}` });
    }
    const info = (await response.json()) as BnsNameInfo;
    res.json({
      name,
      address: info.address ?? null,
      status: info.status ?? "unknown",
      expireBlock: info.expire_block ?? null,
      gracePeriod: info.grace_period ?? null,
      lastTxId: info.last_txid ?? null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[bns] resolve error", err);
    res.status(502).json({ error: "could not reach Hiro API" });
  }
});

/** Reverse lookup: BNS names owned by a given Stacks address. */
bnsRouter.get("/api/bns/owned/:address", async (req, res) => {
  const { address } = req.params;
  if (!STX_PRINCIPAL_PATTERN.test(address)) {
    return res.status(400).json({ error: "invalid Stacks address" });
  }

  try {
    const response = await fetch(
      `${HIRO_BASE_URL}/v1/addresses/stacks/${encodeURIComponent(address)}`,
      { headers: hiroHeaders() },
    );
    if (!response.ok) {
      return res
        .status(response.status < 500 ? response.status : 502)
        .json({ error: `Hiro API returned ${response.status}` });
    }
    const data = (await response.json()) as { names?: string[] };
    res.json({ address, names: data.names ?? [], fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[bns] owned-names error", err);
    res.status(502).json({ error: "could not reach Hiro API" });
  }
});
