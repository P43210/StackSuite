import crypto from "crypto";

/**
 * Validates a Telegram Mini App `initData` string per Telegram's documented
 * algorithm: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * secret_key = HMAC_SHA256(key="WebAppData", data=botToken)
 * check_hash = HMAC_SHA256(key=secret_key, data=data_check_string)
 * valid if check_hash === the "hash" field in initData
 *
 * This needs no network access - it's pure signature verification against
 * a bot token you already have, which is why it's fully testable without
 * a live Telegram connection.
 */

export interface TelegramWebAppUser {
  id: number;
  first_name?: string;
  username?: string;
}

export interface InitDataValidationResult {
  valid: boolean;
  user?: TelegramWebAppUser;
  startParam?: string;
  authDate?: number;
  reason?: string;
}

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60; // a day is generous for a Mini App session

export function validateInitData(
  initData: string,
  botToken: string,
  now: () => number = () => Date.now(),
): InitDataValidationResult {
  if (!botToken) {
    return { valid: false, reason: "bot token not configured" };
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { valid: false, reason: "malformed initData" };
  }

  const hash = params.get("hash");
  if (!hash) {
    return { valid: false, reason: "missing hash" };
  }

  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (computedHash !== hash) {
    return { valid: false, reason: "signature mismatch" };
  }

  const authDateRaw = params.get("auth_date");
  const authDate = authDateRaw ? Number(authDateRaw) : undefined;
  if (authDate !== undefined) {
    const ageSeconds = now() / 1000 - authDate;
    if (ageSeconds > MAX_AUTH_AGE_SECONDS) {
      return { valid: false, reason: "initData expired" };
    }
  }

  let user: TelegramWebAppUser | undefined;
  const userRaw = params.get("user");
  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw);
      if (typeof parsed.id === "number") {
        user = { id: parsed.id, first_name: parsed.first_name, username: parsed.username };
      }
    } catch {
      // fall through - user stays undefined, caller decides if that's fatal
    }
  }

  return {
    valid: true,
    user,
    startParam: params.get("start_param") ?? undefined,
    authDate,
  };
}
