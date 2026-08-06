import { config } from "../config";

export class GasDataError extends Error {}
export class GasNotConfiguredError extends GasDataError {}

// --- Bitcoin: mempool.space, keyless, response shape confirmed against
// real documented examples: { fastestFee, halfHourFee, hourFee,
// economyFee, minimumFee }, all in sat/vB. ---

export interface BitcoinFees {
  fastestFeeSatPerVb: number;
  halfHourFeeSatPerVb: number;
  hourFeeSatPerVb: number;
  economyFeeSatPerVb: number;
}

export async function getBitcoinFees(): Promise<BitcoinFees> {
  let response: Response;
  try {
    response = await fetch("https://mempool.space/api/v1/fees/recommended");
  } catch (err) {
    throw new GasDataError(`Could not reach mempool.space: ${(err as Error).message}`);
  }
  if (!response.ok) {
    throw new GasDataError(`mempool.space returned ${response.status}`);
  }
  const body = (await response.json()) as Record<string, number>;
  return {
    fastestFeeSatPerVb: body.fastestFee,
    halfHourFeeSatPerVb: body.halfHourFee,
    hourFeeSatPerVb: body.hourFee,
    economyFeeSatPerVb: body.economyFee,
  };
}

// --- Ethereum: Etherscan gas oracle. Response shape confirmed against
// real documented examples: { SafeGasPrice, ProposeGasPrice,
// FastGasPrice }, all in Gwei as numeric strings. Needs a free key.
//
// Etherscan's V1 API (api.etherscan.io/api with no chainid) was fully
// deprecated - it now returns { status: "0", message: "NOTOK",
// result: "You are using a deprecated V1 endpoint..." } for every
// call, regardless of key validity. V2 uses a single base path for all
// chains and requires an explicit chainid (1 = Ethereum mainnet). See
// https://docs.etherscan.io/v2-migration. ---

const ETHERSCAN_V2_BASE_URL = "https://api.etherscan.io/v2/api";
const ETHEREUM_MAINNET_CHAIN_ID = 1;

export interface EthereumGas {
  safeGwei: number;
  proposeGwei: number;
  fastGwei: number;
}

export async function getEthereumGas(): Promise<EthereumGas> {
  if (!config.etherscanApiKey) {
    throw new GasNotConfiguredError(
      "Ethereum gas data isn't configured. Get a free key at etherscan.io/apis and set ETHERSCAN_API_KEY.",
    );
  }

  const url =
    `${ETHERSCAN_V2_BASE_URL}?chainid=${ETHEREUM_MAINNET_CHAIN_ID}` +
    `&module=gastracker&action=gasoracle&apikey=${config.etherscanApiKey}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new GasDataError(`Could not reach Etherscan: ${(err as Error).message}`);
  }
  if (!response.ok) {
    throw new GasDataError(`Etherscan returned ${response.status}`);
  }
  const body = (await response.json()) as {
    status: string;
    message: string;
    result?: { SafeGasPrice: string; ProposeGasPrice: string; FastGasPrice: string } | string;
  };
  if (body.status !== "1" || !body.result || typeof body.result === "string") {
    throw new GasDataError(`Etherscan error: ${body.message}`);
  }
  return {
    safeGwei: Number(body.result.SafeGasPrice),
    proposeGwei: Number(body.result.ProposeGasPrice),
    fastGwei: Number(body.result.FastGasPrice),
  };
}

// --- Stacks: Hiro's /extended/v2/mempool/fees.
//
// UNLIKE the two above, this one is only partially confirmed: multiple
// sources agree the endpoint returns token_transfer/contract_call
// objects broken down "by priority levels", but no source I found
// included a full captured example with exact key names. Parsing is
// deliberately defensive - it tries several plausible key spellings
// and falls back to null rather than throwing, so a wrong guess here
// degrades to "no data" instead of a crash. Confirm against a real
// response and tighten this up once verified. ---

export interface StacksFees {
  lowPriority: number | null;
  mediumPriority: number | null;
  highPriority: number | null;
}

export function parseStacksFees(body: any): StacksFees {
  const tt = body?.token_transfer ?? body?.tokenTransfer ?? {};

  function pick(...keys: string[]): number | null {
    for (const key of keys) {
      if (typeof tt[key] === "number") return tt[key];
    }
    return null;
  }

  return {
    lowPriority: pick("low_priority", "low", "no_priority"),
    mediumPriority: pick("medium_priority", "medium", "middle_priority", "middle"),
    highPriority: pick("high_priority", "high"),
  };
}

export async function getStacksFees(): Promise<StacksFees> {
  const baseUrl =
    config.stacksReadNetwork === "mainnet"
      ? "https://api.hiro.so"
      : "https://api.testnet.hiro.so";

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/extended/v2/mempool/fees`, {
      headers: config.hiroApiKey ? { "x-hiro-api-key": config.hiroApiKey } : {},
    });
  } catch (err) {
    throw new GasDataError(`Could not reach Hiro: ${(err as Error).message}`);
  }
  if (!response.ok) {
    throw new GasDataError(`Hiro returned ${response.status}`);
  }
  const body = await response.json();
  return parseStacksFees(body);
}
