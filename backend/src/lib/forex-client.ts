const FRANKFURTER_BASE_URL = "https://api.frankfurter.dev/v1";

export class ForexDataError extends Error {}

/**
 * Returns how many units of `quote` one unit of `base` buys, e.g.
 * getForexRate("USD", "EUR") -> how many EUR per 1 USD.
 * Frankfurter only updates on ECB business days; weekends/holidays
 * return the most recent available rate, which is correct behavior,
 * not stale data.
 */
export async function getForexRate(base: string, quote: string): Promise<number> {
  const url = `${FRANKFURTER_BASE_URL}/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(quote)}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new ForexDataError(`Could not reach Frankfurter: ${(err as Error).message}`);
  }

  if (!response.ok) {
    throw new ForexDataError(`Frankfurter returned ${response.status}`);
  }

  const body = (await response.json()) as { rates: Record<string, number> };
  const rate = body.rates?.[quote];
  if (typeof rate !== "number") {
    throw new ForexDataError(`Frankfurter response missing rate for ${quote}`);
  }
  return rate;
}
