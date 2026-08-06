import { Router } from "express";
import { pingDatabase } from "../db/pool";
import { pingMongo } from "../db/mongo";
import { pingRedis } from "../db/redis";
import { config } from "../config";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const [postgres, mongo, redis] = await Promise.all([
    pingDatabase(),
    pingMongo(),
    pingRedis(),
  ]);

  res.json({
    status: "ok",
    service: "stacksuite-backend",
    network: config.stacksNetwork,
    readNetwork: config.stacksReadNetwork,
    dependencies: {
      postgres,
      mongo,
      redis,
    },
    timestamp: new Date().toISOString(),
  });
});
