import { config } from "../config";

const HIRO_BASE_URL =
  config.stacksReadNetwork === "mainnet"
    ? "https://api.hiro.so"
    : "https://api.testnet.hiro.so";

function hiroHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.hiroApiKey) headers["x-hiro-api-key"] = config.hiroApiKey;
  return headers;
}

export interface StxBalance {
  balance: string;
  estimated_balance?: string;
  locked: string;
  lock_height: number;
  burnchain_unlock_height: number;
}

export interface FtBalanceEntry {
  token: string;
  balance: string;
}

export interface FtBalancesResponse {
  limit: number;
  offset: number;
  total: number;
  results: FtBalanceEntry[];
}

export class HiroApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "HiroApiError";
  }
}

async function hiroFetch<T>(path: string): Promise<T> {
  const url = `${HIRO_BASE_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url, { headers: hiroHeaders() });
  } catch (err) {
    throw new HiroApiError(
      `Could not reach Hiro API at ${url}: ${(err as Error).message}`,
    );
  }
  if (!response.ok) {
    throw new HiroApiError(
      `Hiro API returned ${response.status} for ${path}`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

export function getStxBalance(principal: string): Promise<StxBalance> {
  return hiroFetch<StxBalance>(`/extended/v2/addresses/${principal}/balances/stx`);
}

export function getFtBalances(principal: string): Promise<FtBalancesResponse> {
  return hiroFetch<FtBalancesResponse>(
    `/extended/v2/addresses/${principal}/balances/ft`,
  );
}

export interface AccountTransactionsPage {
  limit: number;
  offset: number;
  total: number;
  results: Array<{
    tx?: {
      tx_id?: string;
      block_height?: number;
      burn_block_time_iso?: string;
    };
    // Some Hiro API versions flatten tx fields onto the result directly
    // rather than nesting under `tx` - accept both shapes defensively,
    // same pattern used elsewhere in this project for un-verified
    // third-party response shapes.
    tx_id?: string;
    block_height?: number;
    burn_block_time_iso?: string;
  }>;
}

/**
 * One page of an address's confirmed transaction history, most-recent
 * first. Used to get the total transaction count (the `total` field) and,
 * with the right offset, the single oldest transaction.
 */
export function getAccountTransactionsPage(
  principal: string,
  limit: number,
  offset: number,
): Promise<AccountTransactionsPage> {
  return hiroFetch<AccountTransactionsPage>(
    `/extended/v1/address/${principal}/transactions?limit=${limit}&offset=${offset}`,
  );
}
