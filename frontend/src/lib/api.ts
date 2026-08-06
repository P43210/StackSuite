export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export interface PortfolioToken {
  contract: string;
  balance: string;
}

export interface PortfolioResponse {
  address: string;
  stx: {
    balanceMicroStx: string;
    lockedMicroStx: string;
    lockHeight: number;
    burnchainUnlockHeight: number;
  };
  tokens: PortfolioToken[];
  fetchedAt: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchPortfolio(address: string): Promise<PortfolioResponse> {
  const res = await fetch(`${API_BASE_URL}/api/portfolio/${address}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export interface TelegramStatus {
  linked: boolean;
  linkedAt?: string;
  subscriptions?: string[];
}

export async function fetchTelegramStatus(address: string): Promise<TelegramStatus> {
  const res = await fetch(`${API_BASE_URL}/api/telegram/status/${address}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export async function requestLinkCode(
  address: string,
): Promise<{ code: string; expiresInSeconds: number }> {
  const res = await fetch(`${API_BASE_URL}/api/telegram/link-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export interface EscrowDetails {
  sender: { value: string };
  recipient: { value: string };
  arbiter: { value: string };
  amount: { value: string };
  status: { value: string };
  "expiration-height": { value: string };
}

export async function fetchEscrow(
  id: number,
): Promise<{ id: number; escrow: EscrowDetails }> {
  const res = await fetch(`${API_BASE_URL}/api/escrow/${id}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export interface VaultStatus {
  paused: boolean;
  idleBalanceMicroStx: string;
  deployedToStrategyMicroStx: string;
}

export async function fetchVaultStatus(): Promise<VaultStatus> {
  const res = await fetch(`${API_BASE_URL}/api/yield-vault/status`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export async function fetchVaultBalance(
  address: string,
): Promise<{ address: string; balanceMicroStx: string }> {
  const res = await fetch(`${API_BASE_URL}/api/yield-vault/balance/${address}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export interface PoxInfo {
  currentCycle: number;
  minThresholdMicroStx: string;
  totalStackedMicroStx: string;
  nextCycle: number;
  nextCycleMinThresholdMicroStx: string;
  rewardCycleLength: number;
  prepareCycleLength: number;
  fetchedAt: string;
}

export async function fetchPoxInfo(): Promise<PoxInfo> {
  const res = await fetch(`${API_BASE_URL}/api/stacking/pox-info`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export interface StackingStatus {
  address: string;
  isStacking: boolean;
  lockedMicroStx: string;
  lockHeight: number;
  burnchainUnlockHeight: number;
  fetchedAt: string;
}

export async function fetchStackingStatus(address: string): Promise<StackingStatus> {
  const res = await fetch(`${API_BASE_URL}/api/stacking/status/${address}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export interface BnsResolution {
  name: string;
  address: string | null;
  status: string;
  expireBlock: number | null;
  gracePeriod: number | null;
  lastTxId: string | null;
  fetchedAt: string;
}

export async function resolveBnsName(name: string): Promise<BnsResolution> {
  const res = await fetch(`${API_BASE_URL}/api/bns/resolve/${encodeURIComponent(name)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export async function fetchOwnedBnsNames(
  address: string,
): Promise<{ address: string; names: string[] }> {
  const res = await fetch(`${API_BASE_URL}/api/bns/owned/${address}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export interface WrappedStats {
  address: string;
  balanceMicroStx: string;
  lockedMicroStx: string;
  isStacking: boolean;
  tokenCount: number;
  transactionCount: number;
  firstTransaction: { txId: string | null; blockHeight: number | null; timeIso: string | null };
  fetchedAt: string;
}

export async function fetchWrappedStats(address: string): Promise<WrappedStats> {
  const res = await fetch(`${API_BASE_URL}/api/wrapped/${address}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number | null;
}

export async function fetchCoinPrices(
  vsCurrency = "usd",
  perPage = 50,
): Promise<{ vsCurrency: string; markets: CoinMarket[] }> {
  const res = await fetch(
    `${API_BASE_URL}/api/market/prices?vs_currency=${vsCurrency}&per_page=${perPage}`,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export async function fetchMovers(
  vsCurrency = "usd",
  limit = 10,
): Promise<{ vsCurrency: string; gainers: CoinMarket[]; losers: CoinMarket[] }> {
  const res = await fetch(
    `${API_BASE_URL}/api/market/movers?vs_currency=${vsCurrency}&limit=${limit}`,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export interface FearGreedReading {
  value: number;
  classification: string;
  timestamp: number;
}

export async function fetchFearGreed(): Promise<FearGreedReading> {
  const res = await fetch(`${API_BASE_URL}/api/market/fear-greed`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export type AssetClass = "crypto" | "forex" | "commodity";

export interface WatchlistItem {
  id: number;
  asset_class: AssetClass;
  symbol: string;
  display_name: string;
  added_at: string;
}

export async function fetchWatchlist(address: string): Promise<{ items: WatchlistItem[] }> {
  const res = await fetch(`${API_BASE_URL}/api/watchlist/${address}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export async function addWatchlistItem(params: {
  address: string;
  assetClass: AssetClass;
  symbol: string;
  displayName: string;
}): Promise<{ item: WatchlistItem }> {
  const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export async function removeWatchlistItem(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/watchlist/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
}

export interface PriceAlert {
  id: number;
  asset_class: AssetClass;
  symbol: string;
  display_name: string;
  comparator: "above" | "below";
  target_price: string;
  triggered: boolean;
  triggered_at: string | null;
  created_at: string;
}

export async function fetchAlerts(address: string): Promise<{ alerts: PriceAlert[] }> {
  const res = await fetch(`${API_BASE_URL}/api/alerts/${address}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export async function createAlert(params: {
  address: string;
  assetClass: AssetClass;
  symbol: string;
  displayName: string;
  comparator: "above" | "below";
  targetPrice: number;
}): Promise<{ alert: PriceAlert }> {
  const res = await fetch(`${API_BASE_URL}/api/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export async function removeAlert(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/alerts/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
}

export interface GasResult<T> {
  data: T | null;
  error: { configured: boolean; message: string } | null;
}

export interface GasResponse {
  bitcoin: GasResult<{
    fastestFeeSatPerVb: number;
    halfHourFeeSatPerVb: number;
    hourFeeSatPerVb: number;
    economyFeeSatPerVb: number;
  }>;
  ethereum: GasResult<{ safeGwei: number; proposeGwei: number; fastGwei: number }>;
  stacks: GasResult<{
    lowPriority: number | null;
    mediumPriority: number | null;
    highPriority: number | null;
  }>;
}

export async function fetchGas(): Promise<GasResponse> {
  const res = await fetch(`${API_BASE_URL}/api/gas`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export async function resolveTelegramIdentity(
  initData: string,
): Promise<{ linked: boolean; address?: string; justLinked: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/telegram/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export async function disconnectTelegram(address: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/telegram/link/${address}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
}

export interface AccountUser {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export async function signInWithGoogle(
  credential: string,
): Promise<{ token: string; user: AccountUser }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export async function requestMagicLink(email: string): Promise<{ sent: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/magic-link/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export async function verifyMagicLink(
  token: string,
): Promise<{ token: string; user: AccountUser }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/magic-link/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export async function fetchAccountSession(
  sessionToken: string,
): Promise<{ user: AccountUser }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/session`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export async function accountLogout(sessionToken: string): Promise<void> {
  await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
}

export async function fetchLinkedWalletForAccount(): Promise<{ address: string | null }> {
  const res = await fetch("/api/account/wallet");
  if (!res.ok) {
    if (res.status === 401) return { address: null };
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
  return res.json();
}

export async function linkWalletToAccount(address: string): Promise<void> {
  const res = await fetch("/api/account/wallet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "request failed", res.status);
  }
}

export function microStxToStx(microStx: string): string {
  const value = BigInt(microStx);
  const whole = value / 1_000_000n;
  const frac = value % 1_000_000n;
  return `${whole}.${frac.toString().padStart(6, "0")}`.replace(/0+$/, "").replace(/\.$/, ".0");
}

/** Inverse of microStxToStx - parses a user-typed STX amount into a
 * microSTX string suitable for @stacks/connect's transfer request.
 * Returns null for anything that isn't a valid non-negative number. */
export function stxToMicroStx(stx: string): string | null {
  const trimmed = stx.trim();
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  const paddedFrac = (frac + "000000").slice(0, 6);
  try {
    const value = BigInt(whole || "0") * 1_000_000n + BigInt(paddedFrac || "0");
    return value.toString();
  } catch {
    return null;
  }
}
