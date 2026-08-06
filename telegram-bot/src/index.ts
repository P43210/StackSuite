import { createBot } from "./bot";
import { startNotifier } from "./notifier";

async function main() {
  const bot = createBot();

  startNotifier(async (chatId, message) => {
    await bot.api.sendMessage(chatId, message);
  });

  console.log("StackSuite Telegram bot starting (long polling)...");
  await bot.start({
    onStart: () => console.log("StackSuite Telegram bot is running."),
  });
}

main().catch((err) => {
  console.error("[bot] fatal error", err);
  process.exit(1);
});
