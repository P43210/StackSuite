"use client";

export type TrackedWalletSource = "stacksuite-wallet" | "watched" | "connected";

export interface TrackedWallet {
  address: string;
  label: string;
  source: TrackedWalletSource;
  addedAt: string;
}

const STORAGE_KEY = "stacksuite-tracked-wallets";

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
  const next: TrackedWallet[] = [
    ...withoutThis,
    { address, label, source, addedAt: new Date().toISOString() },
  ];
  writeAll(next);
  return next;
}

export function untrackWallet(address: string): TrackedWallet[] {
  const next = readAll().filter((w) => w.address !== address);
  writeAll(next);
  return next;
}

export function isTracked(address: string): boolean {
  return readAll().some((w) => w.address === address);
}
