export type AlertComparator = "above" | "below";

/**
 * Whether a price alert's condition has been met. Pure and
 * side-effect-free so it can be tested without any network or database.
 */
export function evaluateAlert(
  currentPrice: number,
  comparator: AlertComparator,
  targetPrice: number,
): boolean {
  if (comparator === "above") return currentPrice >= targetPrice;
  return currentPrice <= targetPrice;
}

export function formatAlertMessage(params: {
  displayName: string;
  comparator: AlertComparator;
  targetPrice: number;
  currentPrice: number;
}): string {
  const direction = params.comparator === "above" ? "rose above" : "fell below";
  return (
    `${params.displayName} ${direction} ${params.targetPrice} ` +
    `(now ${params.currentPrice})`
  );
}
