"use client";

export type TrackedWalletSource = "stacksuite-wallet" | "watched" | "connected";

export interface TrackedWallet {
  address: string;
  label: string;
  source: TrackedWalletSource;
  addedAt: string;
}

const STORAGE_KEY = "stacksuite-tracked-wallets";

// Whether a signed-in StackSuite account is active. Set once from
// AppShell (the one place that already knows accountEmail) so every
// call site below can stay synchronous and unchanged - reads still
// come straight from localStorage for instant UI, writes just also
// fire an async, best-effort push to the account in the background.
let syncEnabled = false;

function readAll(): TrackedWallet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(wallets: TrackedWallet[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
  } catch {
    // Storage unavailable - tracking just won't persist this session.
  }
}

/**
 * Called once (from AppShell) whenever the signed-in account changes.
 * When signing in, pulls this account's server-side list and merges
 * it into this device's local list (union by address, newest
 * addedAt wins) so a wallet tracked on another device shows up here
 * immediately, and vice versa. When signing out, just stops pushing
 * further local changes to the server - it does not erase local data.
 */
export async function initTrackedWalletsSync(signedIn: boolean): Promise<void> {
  syncEnabled = signedIn;
  if (!signedIn) return;

  try {
    const res = await fetch("/api/account/tracked-wallets");
    if (!res.ok) return;
    const { wallets: remote } = (await res.json()) as { wallets: TrackedWallet[] };

    const local = readAll();
    const byAddress = new Map(local.map((w) => [w.address, w]));
    for (const w of remote) {
      const existing = byAddress.get(w.address);
      if (!existing || new Date(w.addedAt) > new Date(existing.addedAt)) {
        byAddress.set(w.address, w);
      }
    }
    const merged = Array.from(byAddress.values());
    writeAll(merged);

    // Push anything that was only local (e.g. tracked before this
    // device was ever signed in) up to the account too, so the next
    // device to sign in also sees it.
    const remoteAddresses = new Set(remote.map((w) => w.address));
    const onlyLocal = local.filter((w) => !remoteAddresses.has(w.address));
    await Promise.all(onlyLocal.map((w) => pushToServer(w)));
  } catch {
    // Offline or backend unavailable - local data still works fine,
    // it just won't reflect other devices until this succeeds later.
  }
}

function pushToServer(wallet: TrackedWallet): Promise<void> {
  return fetch("/api/account/tracked-wallets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: wallet.address, label: wallet.label, source: wallet.source }),
  })
    .then(() => undefined)
    .catch(() => {
      // Best-effort - the local write already succeeded either way.
    });
}

function removeFromServer(address: string): Promise<void> {
  return fetch(`/api/account/tracked-wallets?address=${encodeURIComponent(address)}`, {
    method: "DELETE",
  })
    .then(() => undefined)
    .catch(() => {});
}

export function listTrackedWallets(): TrackedWallet[] {
  return readAll();
}

/**
 * Adds or updates a tracked wallet. Addresses are deduplicated - adding
 * an address that's already tracked just updates its label/source rather
 * than creating a duplicate entry.
 */
export function trackWallet(
  address: string,
  label: string,
  source: TrackedWalletSource,
): TrackedWallet[] {
  const existing = readAll();
  const withoutThis = existing.filter((w) => w.address !== address);
  const entry: TrackedWallet = { address, label, source, addedAt: new Date().toISOString() };
  const next: TrackedWallet[] = [...withoutThis, entry];
  writeAll(next);
  if (syncEnabled) pushToServer(entry);
  return next;
}

export function untrackWallet(address: string): TrackedWallet[] {
  const next = readAll().filter((w) => w.address !== address);
  writeAll(next);
  if (syncEnabled) removeFromServer(address);
  return next;
}

export function isTracked(address: string): boolean {
  return readAll().some((w) => w.address === address);
}
