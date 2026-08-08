"use client";

const STORAGE_KEY = "stacksuite-bns-watchlist";

// Mirrors tracked-wallets.ts's sync flag - see initTrackedWalletsSync
// for the full rationale. Set once from AppShell.
let syncEnabled = false;

function readAll(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(names: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    // Storage unavailable - watchlist just won't persist this session.
  }
}

/**
 * Called once (from AppShell) whenever the signed-in account changes.
 * Merges this account's server-side watchlist into this device's
 * local one (simple union - BNS watches have no per-item timestamp
 * to reconcile against) and pushes anything local-only up to the
 * account, so any device signed into the same account converges on
 * the same list.
 */
export async function initBnsWatchlistSync(signedIn: boolean): Promise<void> {
  syncEnabled = signedIn;
  if (!signedIn) return;

  try {
    const res = await fetch("/api/account/bns-watchlist");
    if (!res.ok) return;
    const { names: remote } = (await res.json()) as { names: string[] };

    const local = readAll();
    const merged = Array.from(new Set([...local, ...remote]));
    writeAll(merged);

    const onlyLocal = local.filter((n) => !remote.includes(n));
    await Promise.all(onlyLocal.map((n) => pushToServer(n)));
  } catch {
    // Offline or backend unavailable - local data still works fine.
  }
}

function pushToServer(name: string): Promise<void> {
  return fetch("/api/account/bns-watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
    .then(() => undefined)
    .catch(() => {});
}

function removeFromServer(name: string): Promise<void> {
  return fetch(`/api/account/bns-watchlist?name=${encodeURIComponent(name)}`, {
    method: "DELETE",
  })
    .then(() => undefined)
    .catch(() => {});
}

export function listWatchedBnsNames(): string[] {
  return readAll();
}

export function addToBnsWatchlist(name: string): string[] {
  const normalized = name.trim().toLowerCase();
  const existing = readAll();
  if (existing.includes(normalized)) return existing;
  const next = [...existing, normalized];
  writeAll(next);
  if (syncEnabled) pushToServer(normalized);
  return next;
}

export function removeFromBnsWatchlist(name: string): string[] {
  const next = readAll().filter((n) => n !== name);
  writeAll(next);
  if (syncEnabled) removeFromServer(name);
  return next;
}
