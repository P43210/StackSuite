import { Bot } from "grammy";
import { config } from "./config";
import { WELCOME_MESSAGE, handleLinkCommand, handleStatusCommand } from "./commands";

export function createBot(): Bot {
  if (!config.botToken) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is not set. Get one from @BotFather and add it to .env",
    );
  }

  const bot = new Bot(config.botToken);

  bot.command("start", async (ctx) => {
    await ctx.reply(WELCOME_MESSAGE);
  });

  bot.command("link", async (ctx) => {
    const reply = await handleLinkCommand(ctx.chat.id, ctx.match?.toString());
    await ctx.reply(reply);
  });

  bot.command("status", async (ctx) => {
    const reply = await handleStatusCommand(ctx.match?.toString());
    await ctx.reply(reply);
  });

  bot.catch((err) => {
    console.error("[bot] unhandled error", err.error);
  });

  return bot;
}
