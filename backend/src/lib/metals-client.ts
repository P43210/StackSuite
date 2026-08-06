import { config } from "../config";

export class MetalsDataError extends Error {}
export class MetalsNotConfiguredError extends MetalsDataError {
  constructor() {
    super(
      "Metals data isn't configured. Sign up for a free key at goldapi.io and set GOLD_API_KEY.",
    );
  }
}

const SUPPORTED_METALS = new Set(["XAU", "XAG", "XPT", "XPD"]);

/**
 * Spot price for one troy ounce of `metal` (XAU/XAG/XPT/XPD) in `currency`.
 * Unlike the crypto and forex feeds, this genuinely has no free-and-keyless
 * option among the providers checked - GoldAPI.io needs a free signup.
 */
export async function getMetalPrice(metal: string, currency: string): Promise<number> {
  if (!SUPPORTED_METALS.has(metal)) {
    throw new MetalsDataError(`Unsupported metal symbol: ${metal}`);
  }
  if (!config.goldApiKey) {
    throw new MetalsNotConfiguredError();
  }

  const url = `https://www.goldapi.io/api/${metal}/${currency}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "x-access-token": config.goldApiKey, Accept: "application/json" },
    });
  } catch (err) {
    throw new MetalsDataError(`Could not reach GoldAPI: ${(err as Error).message}`);
  }

  if (!response.ok) {
    throw new MetalsDataError(`GoldAPI returned ${response.status}`);
  }

  const body = (await response.json()) as { price?: number };
  if (typeof body.price !== "number") {
    throw new MetalsDataError("GoldAPI response missing price");
  }
  return body.price;
}
