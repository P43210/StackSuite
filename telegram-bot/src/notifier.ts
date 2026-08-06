import Redis from "ioredis";
import { config } from "./config";

export const NOTIFICATIONS_CHANNEL = "stacksuite:notifications";

interface QueuedNotification {
  chatId: number;
  message: string;
}

export function parseNotification(raw: string): QueuedNotification | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.chatId === "number" && typeof parsed.message === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export type SendMessageFn = (chatId: number, message: string) => Promise<void>;

export function startNotifier(sendMessage: SendMessageFn): Redis {
  if (!config.redisUrl) {
    throw new Error("REDIS_URL is not set, cannot start notifier");
  }

  const subscriber = new Redis(config.redisUrl);

  subscriber.subscribe(NOTIFICATIONS_CHANNEL, (err) => {
    if (err) {
      console.error("[notifier] failed to subscribe", err);
      return;
    }
    console.log(`[notifier] subscribed to ${NOTIFICATIONS_CHANNEL}`);
  });

  subscriber.on("message", async (_channel, raw) => {
    const notification = parseNotification(raw);
    if (!notification) {
      console.error("[notifier] dropped malformed notification", raw);
      return;
    }
    try {
      await sendMessage(notification.chatId, notification.message);
    } catch (err) {
      console.error("[notifier] failed to send message", err);
    }
  });

  return subscriber;
}
