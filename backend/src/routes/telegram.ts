import { Router } from "express";
import crypto from "crypto";
import { getRedis } from "../db/redis";
import { getMongoConnection } from "../db/mongo";
import { config } from "../config";
import { validateInitData } from "../lib/telegram-auth";
import { TelegramLink } from "../db/models/TelegramLink";

export const telegramRouter = Router();

const STX_PRINCIPAL_PATTERN = /^S[PT][0-9A-Z]{38,39}$/;
const LINK_CODE_TTL_SECONDS = 600;

function linkCodeKey(code: string) {
  return `telegram:link-code:${code}`;
}

function generateCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

// Mongoose won't attempt a connection until something actually queries it,
// and with buffering disabled (see db/mongo.ts) a query before that
// connection resolves fails immediately rather than hanging. This makes
// sure the connection is established (or cleanly reports unavailable)
// before any route touches the TelegramLink model.
async function ensureMongoReady(): Promise<boolean> {
  const connection = getMongoConnection();
  if (!connection) return false;
  try {
    await connection;
    return true;
  } catch {
    return false;
  }
}

/**
 * Consumes a link code and creates/overwrites the link for that chat id.
 * Shared by the bot's /link command (via confirm-link) and the Mini
 * App's auto-link-on-open flow (via resolve).
 */
async function consumeLinkCode(code: string, chatId: number): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;

  const address = await redis.get(linkCodeKey(code));
  if (!address) return null;

  await TelegramLink.findOneAndUpdate(
    { stacksAddress: address },
    {
      $set: { telegramChatId: chatId, linkedAt: new Date() },
      $addToSet: { subscriptions: "stx-transfer" },
    },
    { upsert: true },
  );

  await redis.del(linkCodeKey(code));
  return address;
}

telegramRouter.post("/api/telegram/link-code", async (req, res) => {
  const { address } = req.body ?? {};
  if (typeof address !== "string" || !STX_PRINCIPAL_PATTERN.test(address)) {
    return res.status(400).json({ error: "invalid Stacks address" });
  }

  const redis = getRedis();
  if (!redis) {
    return res.status(503).json({ error: "linking service unavailable" });
  }

  const code = generateCode();
  await redis.set(linkCodeKey(code), address, "EX", LINK_CODE_TTL_SECONDS);

  res.json({ code, expiresInSeconds: LINK_CODE_TTL_SECONDS });
});

telegramRouter.post("/api/telegram/confirm-link", async (req, res) => {
  const authHeader = req.header("authorization") ?? "";
  if (
    !config.telegramBotSharedSecret ||
    authHeader !== config.telegramBotSharedSecret
  ) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { code, chatId } = req.body ?? {};
  if (typeof code !== "string" || typeof chatId !== "number") {
    return res.status(400).json({ error: "code and chatId are required" });
  }

  if (!(await ensureMongoReady())) {
    return res.status(503).json({ error: "linking service unavailable" });
  }

  try {
    const address = await consumeLinkCode(code, chatId);
    if (!address) {
      return res.status(404).json({ error: "code not found or expired" });
    }
    res.json({ address });
  } catch (err) {
    console.error("[telegram] confirm-link failed", err);
    res.status(503).json({ error: "linking service unavailable" });
  }
});

telegramRouter.post("/api/telegram/resolve", async (req, res) => {
  const { initData } = req.body ?? {};
  if (typeof initData !== "string") {
    return res.status(400).json({ error: "initData is required" });
  }

  const validation = validateInitData(initData, config.telegramBotToken);
  if (!validation.valid || !validation.user) {
    return res.status(401).json({ error: validation.reason ?? "invalid initData" });
  }

  if (!(await ensureMongoReady())) {
    return res.status(503).json({ error: "linking service unavailable" });
  }

  try {
    const chatId = validation.user.id;
    let justLinked = false;

    if (validation.startParam) {
      const linkedAddress = await consumeLinkCode(validation.startParam, chatId);
      justLinked = linkedAddress !== null;
    }

    const link = await TelegramLink.findOne({ telegramChatId: chatId });
    if (!link) {
      return res.json({ linked: false, justLinked });
    }

    res.json({ linked: true, address: link.stacksAddress, justLinked });
  } catch (err) {
    console.error("[telegram] resolve failed", err);
    res.status(503).json({ error: "linking service unavailable" });
  }
});

telegramRouter.get("/api/telegram/status/:address", async (req, res) => {
  const { address } = req.params;
  if (!STX_PRINCIPAL_PATTERN.test(address)) {
    return res.status(400).json({ error: "invalid Stacks address" });
  }

  if (!(await ensureMongoReady())) {
    return res.status(503).json({ error: "database unavailable" });
  }

  try {
    const link = await TelegramLink.findOne({ stacksAddress: address });
    if (!link) {
      return res.json({ linked: false });
    }
    res.json({
      linked: true,
      linkedAt: link.linkedAt,
      subscriptions: link.subscriptions,
    });
  } catch (err) {
    console.error("[telegram] status lookup failed", err);
    res.status(503).json({ error: "database unavailable" });
  }
});

telegramRouter.delete("/api/telegram/link/:address", async (req, res) => {
  const { address } = req.params;
  if (!STX_PRINCIPAL_PATTERN.test(address)) {
    return res.status(400).json({ error: "invalid Stacks address" });
  }

  if (!(await ensureMongoReady())) {
    return res.status(503).json({ error: "database unavailable" });
  }

  try {
    const result = await TelegramLink.deleteOne({ stacksAddress: address });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "not linked" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("[telegram] delete failed", err);
    res.status(503).json({ error: "database unavailable" });
  }
});
