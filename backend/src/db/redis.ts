import Redis from "ioredis";
import { config } from "../config";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!config.redisUrl) return null;
  if (!client) {
    client = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
  }
  return client;
}

export async function pingRedis(): Promise<"ok" | "unconfigured" | "unreachable"> {
  const r = getRedis();
  if (!r) return "unconfigured";
  try {
    if (r.status !== "ready" && r.status !== "connecting") {
      await r.connect();
    }
    await r.ping();
    return "ok";
  } catch {
    return "unreachable";
  }
}
