import { Router } from "express";
import { cvToHex, cvToJSON, hexToCV, Cl } from "@stacks/transactions";
import { config } from "../config";

export const escrowRouter = Router();

const HIRO_BASE_URL =
  config.stacksNetwork === "mainnet"
    ? "https://api.hiro.so"
    : "https://api.testnet.hiro.so";

escrowRouter.get("/api/escrow/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 0) {
    return res.status(400).json({ error: "invalid escrow id" });
  }
  if (!config.escrowContractAddress) {
    return res.status(503).json({ error: "escrow contract not configured" });
  }

  const url = `${HIRO_BASE_URL}/v2/contracts/call-read/${config.escrowContractAddress}/${config.escrowContractName}/get-escrow`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.hiroApiKey ? { "x-hiro-api-key": config.hiroApiKey } : {}),
      },
      body: JSON.stringify({
        sender: config.escrowContractAddress,
        arguments: [cvToHex(Cl.uint(id))],
      }),
    });
  } catch (err) {
    return res.status(502).json({
      error: `Could not reach Stacks node: ${(err as Error).message}`,
    });
  }

  if (!response.ok) {
    return res.status(502).json({ error: `Node returned ${response.status}` });
  }

  const body = (await response.json()) as { okay: boolean; result: string };
  if (!body.okay) {
    return res.status(502).json({ error: "read-only call failed" });
  }

  const decoded = cvToJSON(hexToCV(body.result));

  // decoded.value is `none` if the escrow id doesn't exist, otherwise
  // `{ value: { ...fields } }` for the `some` wrapping a tuple.
  if (!decoded.value) {
    return res.status(404).json({ error: "escrow not found" });
  }

  res.json({ id, escrow: decoded.value.value ?? decoded.value });
});
