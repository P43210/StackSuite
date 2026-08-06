import "dotenv/config";

export const config = {
  botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  backendUrl: process.env.BACKEND_URL ?? "http://localhost:4000",
  botSharedSecret: process.env.TELEGRAM_BOT_SHARED_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
};
