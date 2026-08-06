import { Router } from "express";
import { cvToHex, cvToJSON, hexToCV, Cl } from "@stacks/transactions";
import { config } from "../config";

export const yieldVaultRouter = Router();

const HIRO_BASE_URL =
  config.stacksNetwork === "mainnet"
    ? "https://api.hiro.so"
    : "https://api.testnet.hiro.so";

async function callReadOnly(functionName: string, args: string[]) {
  const url = `${HIRO_BASE_URL}/v2/contracts/call-read/${config.yieldVaultContractAddress}/${config.yieldVaultContractName}/${functionName}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.hiroApiKey ? { "x-hiro-api-key": config.hiroApiKey } : {}),
    },
    body: JSON.stringify({
      sender: config.yieldVaultContractAddress,
      arguments: args,
    }),
  });

  if (!response.ok) {
    throw new Error(`Node returned ${response.status}`);
  }

  const body = (await response.json()) as { okay: boolean; result: string };
  if (!body.okay) {
    throw new Error("read-only call failed");
  }

  return cvToJSON(hexToCV(body.result));
}

const STX_PRINCIPAL_PATTERN = /^S[PT][0-9A-Z]{38,39}$/;

yieldVaultRouter.get("/api/yield-vault/status", async (_req, res) => {
  if (!config.yieldVaultContractAddress) {
    return res.status(503).json({ error: "yield vault not configured" });
  }

  try {
    const [paused, idle, deployed] = await Promise.all([
      callReadOnly("get-paused", []),
      callReadOnly("get-idle-balance", []),
      callReadOnly("get-deployed-to-strategy", []),
    ]);

    res.json({
      paused: paused.value,
      idleBalanceMicroStx: idle.value,
      deployedToStrategyMicroStx: deployed.value,
    });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

yieldVaultRouter.get("/api/yield-vault/balance/:address", async (req, res) => {
  const { address } = req.params;
  if (!STX_PRINCIPAL_PATTERN.test(address)) {
    return res.status(400).json({ error: "invalid Stacks address" });
  }
  if (!config.yieldVaultContractAddress) {
    return res.status(503).json({ error: "yield vault not configured" });
  }

  try {
    const balance = await callReadOnly("get-balance", [cvToHex(Cl.principal(address))]);
    res.json({ address, balanceMicroStx: balance.value });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});
