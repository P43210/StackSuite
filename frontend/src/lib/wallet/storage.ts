/**
 * Minimal storage interface the wallet manager depends on. The real
 * implementation (indexeddb-storage.ts) is genuinely browser-only and
 * can't be exercised in this sandbox - dependency injection lets the
 * actual wallet orchestration logic (wallet-manager.ts) be fully tested
 * with an in-memory fake instead, which is where the real risk of bugs
 * lives anyway (the storage adapter itself is a thin, ten-line wrapper).
 */
export interface WalletStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}
