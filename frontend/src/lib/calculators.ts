/**
 * Pure, framework-free math for the calculator tools. Kept separate from
 * any component so it can be unit tested directly and reused wherever
 * needed (e.g. pre-filling a field with a computed value elsewhere).
 */

export class CalculatorInputError extends Error {}

/**
 * Converts an amount of one asset into another, using each asset's price
 * in a common quote currency (typically USD) as the pivot. Works for
 * crypto-to-crypto and crypto-to-USD; converting to a non-USD fiat
 * currency isn't supported yet, since that also needs a forex rate this
 * tool doesn't have (see the Watchlist forex work).
 */
export function convertByUsdPivot(
  amount: number,
  fromPriceUsd: number,
  toPriceUsd: number,
): number {
  if (amount < 0) throw new CalculatorInputError("amount must be non-negative");
  if (fromPriceUsd <= 0) throw new CalculatorInputError("fromPriceUsd must be positive");
  if (toPriceUsd <= 0) throw new CalculatorInputError("toPriceUsd must be positive");

  const valueUsd = amount * fromPriceUsd;
  return valueUsd / toPriceUsd;
}

export interface ProfitCalculationInput {
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  /** Total fee percentage applied once on entry and once on exit, e.g. 0.1 for 0.1% */
  feePercent?: number;
}

export interface ProfitCalculationResult {
  costBasis: number;
  exitValue: number;
  entryFee: number;
  exitFee: number;
  netProfit: number;
  netProfitPercent: number;
}

export function calculateProfit(input: ProfitCalculationInput): ProfitCalculationResult {
  const { entryPrice, exitPrice, quantity } = input;
  const feePercent = input.feePercent ?? 0;

  if (entryPrice <= 0) throw new CalculatorInputError("entryPrice must be positive");
  if (exitPrice < 0) throw new CalculatorInputError("exitPrice must be non-negative");
  if (quantity <= 0) throw new CalculatorInputError("quantity must be positive");
  if (feePercent < 0) throw new CalculatorInputError("feePercent must be non-negative");

  const costBasis = entryPrice * quantity;
  const exitValue = exitPrice * quantity;
  const entryFee = costBasis * (feePercent / 100);
  const exitFee = exitValue * (feePercent / 100);

  const netProfit = exitValue - exitFee - (costBasis + entryFee);
  const netProfitPercent = (netProfit / (costBasis + entryFee)) * 100;

  return { costBasis, exitValue, entryFee, exitFee, netProfit, netProfitPercent };
}

export interface PositionSizeInput {
  accountBalance: number;
  riskPercent: number;
  entryPrice: number;
  stopLossPrice: number;
}

export interface PositionSizeResult {
  riskAmount: number;
  riskPerUnit: number;
  positionSizeUnits: number;
  positionValue: number;
  /** Position value as a percentage of the account balance, for a sanity check. */
  positionValuePercentOfAccount: number;
}

export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult {
  const { accountBalance, riskPercent, entryPrice, stopLossPrice } = input;

  if (accountBalance <= 0) throw new CalculatorInputError("accountBalance must be positive");
  if (riskPercent <= 0 || riskPercent > 100) {
    throw new CalculatorInputError("riskPercent must be between 0 and 100");
  }
  if (entryPrice <= 0) throw new CalculatorInputError("entryPrice must be positive");
  if (stopLossPrice <= 0) throw new CalculatorInputError("stopLossPrice must be positive");
  if (stopLossPrice === entryPrice) {
    throw new CalculatorInputError("stopLossPrice cannot equal entryPrice");
  }

  const riskAmount = accountBalance * (riskPercent / 100);
  const riskPerUnit = Math.abs(entryPrice - stopLossPrice);
  const positionSizeUnits = riskAmount / riskPerUnit;
  const positionValue = positionSizeUnits * entryPrice;
  const positionValuePercentOfAccount = (positionValue / accountBalance) * 100;

  return {
    riskAmount,
    riskPerUnit,
    positionSizeUnits,
    positionValue,
    positionValuePercentOfAccount,
  };
}
