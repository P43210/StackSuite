import { config } from "./config";

export const WELCOME_MESSAGE =
  "Welcome to StackSuite. Connect your wallet in the app, tap \"Link Telegram\" " +
  "on the Bot tab, then send /link <code> here to start getting on-chain alerts.";

export async function handleLinkCommand(
  chatId: number,
  code: string | undefined,
): Promise<string> {
  const trimmed = code?.trim().toUpperCase();

  if (!trimmed) {
    return "Send it as /link <code>, using the code shown in the StackSuite app.";
  }

  let response: Response;
  try {
    response = await fetch(`${config.backendUrl}/api/telegram/confirm-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: config.botSharedSecret,
      },
      body: JSON.stringify({ code: trimmed, chatId }),
    });
  } catch {
    return "Could not reach StackSuite right now. Try again in a moment.";
  }

  if (response.status === 404) {
    return "That code is invalid or has expired. Generate a new one in the app.";
  }
  if (!response.ok) {
    return "Something went wrong linking your account. Try again shortly.";
  }

  const body = (await response.json()) as { address: string };
  return `Linked. You'll get alerts here for ${body.address.slice(0, 8)}...`;
}

export async function handleStatusCommand(address: string | undefined): Promise<string> {
  if (!address) {
    return "Usage: /status <your-stacks-address>";
  }

  let response: Response;
  try {
    response = await fetch(`${config.backendUrl}/api/telegram/status/${address}`);
  } catch {
    return "Could not reach StackSuite right now. Try again in a moment.";
  }

  if (!response.ok) {
    return "Could not look up that address.";
  }

  const body = (await response.json()) as {
    linked: boolean;
    subscriptions?: string[];
  };

  if (!body.linked) {
    return "That address isn't linked to this chat yet.";
  }

  return `Linked. Subscriptions: ${body.subscriptions?.join(", ") || "none"}`;
}
