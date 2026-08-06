import { describe, expect, it } from "vitest";
import crypto from "crypto";
import { validateInitData } from "./telegram-auth";

const TEST_BOT_TOKEN = "123456:TEST-fake-token-for-unit-tests-only";

/**
 * Signs a set of initData fields exactly the way Telegram does, so tests
 * exercise the real verification algorithm end to end rather than mocking
 * it away.
 */
function signInitData(fields: Record<string, string>, botToken = TEST_BOT_TOKEN): string {
  const pairs = Object.entries(fields).map(([k, v]) => `${k}=${v}`);
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const params = new URLSearchParams({ ...fields, hash });
  return params.toString();
}

describe("validateInitData", () => {
  it("accepts a correctly signed payload and extracts the user", () => {
    const authDate = String(Math.floor(Date.now() / 1000));
    const initData = signInitData({
      auth_date: authDate,
      user: JSON.stringify({ id: 987654321, first_name: "Ada", username: "ada" }),
    });

    const result = validateInitData(initData, TEST_BOT_TOKEN);

    expect(result.valid).toBe(true);
    expect(result.user).toEqual({ id: 987654321, first_name: "Ada", username: "ada" });
  });

  it("extracts start_param when present", () => {
    const authDate = String(Math.floor(Date.now() / 1000));
    const initData = signInitData({
      auth_date: authDate,
      user: JSON.stringify({ id: 1 }),
      start_param: "ABC123",
    });

    const result = validateInitData(initData, TEST_BOT_TOKEN);
    expect(result.valid).toBe(true);
    expect(result.startParam).toBe("ABC123");
  });

  it("rejects a payload signed with the wrong bot token", () => {
    const authDate = String(Math.floor(Date.now() / 1000));
    const initData = signInitData(
      { auth_date: authDate, user: JSON.stringify({ id: 1 }) },
      "999999:a-different-token",
    );

    const result = validateInitData(initData, TEST_BOT_TOKEN);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("signature mismatch");
  });

  it("rejects a tampered field even if the hash is present", () => {
    const authDate = String(Math.floor(Date.now() / 1000));
    const initData = signInitData({
      auth_date: authDate,
      user: JSON.stringify({ id: 111 }),
    });

    // Tamper: swap the user id after signing, keeping the original hash
    const tampered = initData.replace("111", "999");

    const result = validateInitData(tampered, TEST_BOT_TOKEN);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("signature mismatch");
  });

  it("rejects a payload with no hash field", () => {
    const result = validateInitData("auth_date=123&user=%7B%7D", TEST_BOT_TOKEN);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("missing hash");
  });

  it("rejects when the bot token isn't configured", () => {
    const result = validateInitData("hash=abc", "");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("bot token not configured");
  });

  it("rejects initData older than the max allowed age", () => {
    const oldAuthDate = String(Math.floor(Date.now() / 1000) - 999_999);
    const initData = signInitData({
      auth_date: oldAuthDate,
      user: JSON.stringify({ id: 1 }),
    });

    const result = validateInitData(initData, TEST_BOT_TOKEN);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("initData expired");
  });

  it("still validates correctly regardless of key order in the raw string", () => {
    const authDate = String(Math.floor(Date.now() / 1000));
    // Build in a different order than signInitData's internal sort - the
    // algorithm should be order-independent since it re-sorts internally.
    const fields = { user: JSON.stringify({ id: 42 }), auth_date: authDate };
    const initData = signInitData(fields);
    const shuffled = initData.split("&").reverse().join("&");

    const result = validateInitData(shuffled, TEST_BOT_TOKEN);
    expect(result.valid).toBe(true);
  });
});
