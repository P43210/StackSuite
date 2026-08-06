"use client";

const STORAGE_KEY = "stacksuite-bns-watchlist";

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

export function listWatchedBnsNames(): string[] {
  return readAll();
}

export function addToBnsWatchlist(name: string): string[] {
  const normalized = name.trim().toLowerCase();
  const existing = readAll();
  if (existing.includes(normalized)) return existing;
  const next = [...existing, normalized];
  writeAll(next);
  return next;
}

export function removeFromBnsWatchlist(name: string): string[] {
  const next = readAll().filter((n) => n !== name);
  writeAll(next);
  return next;
}
