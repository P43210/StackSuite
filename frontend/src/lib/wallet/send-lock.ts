/**
 * Replay/double-send protection for the broadcast path.
 *
 * Two layers, both needed:
 *  1. An in-memory "in flight" lock per chain - blocks a double-click
 *     or a re-render-triggered double-submit while a send is actively
 *     being built/signed/broadcast in this tab.
 *  2. A short-lived idempotency key persisted in localStorage, keyed
 *     by the exact (chain, recipient, amount) tuple - blocks a
 *     duplicate submit from a page reload or a second tab within the
 *     window where the first broadcast might not have confirmed yet.
 *
 * This is NOT a substitute for idempotent broadcast on the node side
 * (nodes will happily accept the same signed tx twice - it just gets
 * rejected as a duplicate txid, which is fine). It exists to stop the
 * wallet from *building and signing two different transactions* for
 * the same intended send (e.g. two different nonces both confirming).
 */

const IN_FLIGHT = new Set<string>();
const DEDUPE_WINDOW_MS = 60_000;

function dedupeKey(chain: string, recipient: string, amount: string): string {
  return `send-dedupe:${chain}:${recipient.toLowerCase()}:${amount}`;
}

export class DuplicateSendError extends Error {
  constructor() {
    super("A send with these exact details was just submitted. Wait a minute before retrying.");
  }
}

export class SendInProgressError extends Error {
  constructor() {
    super("A send is already in progress for this chain. Wait for it to finish.");
  }
}

/**
 * Acquire the lock for a send. Throws if one is already in flight for
 * this chain, or if the identical send was just submitted. Returns a
 * release function that MUST be called in a `finally` block.
 */
export function acquireSendLock(chain: string, recipient: string, amount: string): () => void {
  if (IN_FLIGHT.has(chain)) {
    throw new SendInProgressError();
  }

  const key = dedupeKey(chain, recipient, amount);
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const submittedAt = Number(raw);
      if (Number.isFinite(submittedAt) && Date.now() - submittedAt < DEDUPE_WINDOW_MS) {
        throw new DuplicateSendError();
      }
    }
    window.localStorage.setItem(key, String(Date.now()));
  } catch (err) {
    if (err instanceof DuplicateSendError) throw err;
    // localStorage unavailable (private browsing, etc.) - fall through,
    // the in-memory lock below still protects against same-tab double-click.
  }

  IN_FLIGHT.add(chain);
  return () => {
    IN_FLIGHT.delete(chain);
  };
}
