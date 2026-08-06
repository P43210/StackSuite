import type Redis from "ioredis";
import { TelegramLink } from "../db/models/TelegramLink";

export const NOTIFICATIONS_CHANNEL = "stacksuite:notifications";

interface StxTransfer {
  sender: string;
  recipient: string;
  amountMicroStx: string;
  txid: string;
}

async function chatIdsSubscribed(address: string, eventType: string): Promise<number[]> {
  const links = await TelegramLink.find({
    stacksAddress: address,
    subscriptions: eventType,
  });
  return links.map((link) => link.telegramChatId);
}

function formatStx(microStx: string): string {
  const value = BigInt(microStx);
  const whole = value / 1_000_000n;
  const frac = (value % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

export async function notifyStxTransfer(
  redis: Redis,
  transfer: StxTransfer,
): Promise<number> {
  const amount = formatStx(transfer.amountMicroStx);
  let sent = 0;

  const recipientChatIds = await chatIdsSubscribed(transfer.recipient, "stx-transfer");
  for (const chatId of recipientChatIds) {
    await redis.publish(
      NOTIFICATIONS_CHANNEL,
      JSON.stringify({
        chatId,
        message: `Received ${amount} STX from ${transfer.sender.slice(0, 8)}...`,
      }),
    );
    sent += 1;
  }

  const senderChatIds = await chatIdsSubscribed(transfer.sender, "stx-transfer");
  for (const chatId of senderChatIds) {
    await redis.publish(
      NOTIFICATIONS_CHANNEL,
      JSON.stringify({
        chatId,
        message: `Sent ${amount} STX to ${transfer.recipient.slice(0, 8)}...`,
      }),
    );
    sent += 1;
  }

  return sent;
}

// Chainhook payloads wrap the same event shapes documented for the Stacks
// node event observer. This walks the documented shape defensively: it
// skips anything that doesn't match rather than throwing, since the exact
// wrapping can vary by chainhook predicate configuration and should be
// confirmed against a real payload before this goes live on mainnet.
export function extractStxTransfers(applyBlocks: unknown[]): StxTransfer[] {
  const transfers: StxTransfer[] = [];

  for (const block of applyBlocks) {
    const transactions = (block as any)?.transactions;
    if (!Array.isArray(transactions)) continue;

    for (const tx of transactions) {
      const events =
        tx?.metadata?.receipt?.events ?? tx?.metadata?.events ?? tx?.events;
      if (!Array.isArray(events)) continue;

      for (const event of events) {
        const transfer = event?.stx_transfer_event;
        if (
          transfer &&
          typeof transfer.sender === "string" &&
          typeof transfer.recipient === "string" &&
          typeof transfer.amount === "string"
        ) {
          transfers.push({
            sender: transfer.sender,
            recipient: transfer.recipient,
            amountMicroStx: transfer.amount,
            txid: tx.transaction_identifier?.hash ?? tx.txid ?? "unknown",
          });
        }
      }
    }
  }

  return transfers;
}
