import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  mongodbUri: process.env.MONGODB_URI ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  // Gates the escrow/yield-vault CONTRACT CALLS only. Stays testnet by
  // default on purpose (see README) until those contracts are audited
  // and deployed for real - don't repurpose this for read-only lookups.
  stacksNetwork: process.env.STACKS_NETWORK ?? "testnet",
  // Used for every *read-only* Stacks lookup: BNS names, address
  // balances/portfolio, stacking status, PoX info, Stacks mempool fees.
  // These carry no fund risk, and a real BNS name like "beebrain.btc" or
  // a real wallet address only exists on one network - almost always
  // mainnet for anyone using this as an actual portfolio tool. Defaults
  // to mainnet independently of STACKS_NETWORK above; override with
  // STACKS_READ_NETWORK=testnet if you specifically want to browse
  // testnet names/addresses.
  stacksReadNetwork: process.env.STACKS_READ_NETWORK ?? "mainnet",
  hiroApiKey: process.env.HIRO_API_KEY ?? "",
  chainhookSharedSecret: process.env.CHAINHOOK_SHARED_SECRET ?? "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramBotSharedSecret: process.env.TELEGRAM_BOT_SHARED_SECRET ?? "",
  escrowContractAddress: process.env.ESCROW_CONTRACT_ADDRESS ?? "",
  escrowContractName: process.env.ESCROW_CONTRACT_NAME ?? "escrow",
  yieldVaultContractAddress: process.env.YIELD_VAULT_CONTRACT_ADDRESS ?? "",
  yieldVaultContractName: process.env.YIELD_VAULT_CONTRACT_NAME ?? "yield-vault",
  coingeckoApiKey: process.env.COINGECKO_API_KEY ?? "",
  goldApiKey: process.env.GOLD_API_KEY ?? "",
  etherscanApiKey: process.env.ETHERSCAN_API_KEY ?? "",
};

export function assertProductionConfig() {
  if (config.nodeEnv === "production") {
    required("DATABASE_URL");
    required("MONGODB_URI");
    required("REDIS_URL");
    required("CHAINHOOK_SHARED_SECRET");
  }
}
