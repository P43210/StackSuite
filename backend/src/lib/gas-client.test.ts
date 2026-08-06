import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { parseStacksFees } from "./gas-client";

describe("getEthereumGas", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // config.ts reads process.env at import time and Vitest's module
    // registry is shared across tests in this file (the top-level
    // static import at the top of this file already cached it once
    // with no key set) - reset so the dynamic re-import below actually
    // picks up the env var this test just set.
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
    delete process.env.ETHERSCAN_API_KEY;
  });

  it("calls the Etherscan V2 endpoint with a chainid, not the deprecated V1 path", async () => {
    process.env.ETHERSCAN_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "1",
        message: "OK",
        result: { SafeGasPrice: "10", ProposeGasPrice: "12", FastGasPrice: "15" },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getEthereumGas } = await import("./gas-client");
    const result = await getEthereumGas();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("https://api.etherscan.io/v2/api");
    expect(calledUrl).toContain("chainid=1");
    expect(calledUrl).not.toMatch(/^https:\/\/api\.etherscan\.io\/api\?/);
    expect(result).toEqual({ safeGwei: 10, proposeGwei: 12, fastGwei: 15 });
  });

  it("surfaces the V1-deprecation body as an error instead of parsing it as gas data", async () => {
    process.env.ETHERSCAN_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "0",
        message: "NOTOK",
        result: "You are using a deprecated V1 endpoint, switch to Etherscan API V2",
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { getEthereumGas } = await import("./gas-client");
    await expect(getEthereumGas()).rejects.toThrow(/NOTOK/);
  });
});

describe("parseStacksFees", () => {
  it("parses snake_case priority keys", () => {
    const body = {
      token_transfer: { low_priority: 200, medium_priority: 400, high_priority: 800 },
    };
    expect(parseStacksFees(body)).toEqual({
      lowPriority: 200,
      mediumPriority: 400,
      highPriority: 800,
    });
  });

  it("parses short priority key names", () => {
    const body = { token_transfer: { low: 200, medium: 400, high: 800 } };
    expect(parseStacksFees(body)).toEqual({
      lowPriority: 200,
      mediumPriority: 400,
      highPriority: 800,
    });
  });

  it("parses camelCase top-level key", () => {
    const body = { tokenTransfer: { low: 100, medium: 200, high: 300 } };
    expect(parseStacksFees(body)).toEqual({
      lowPriority: 100,
      mediumPriority: 200,
      highPriority: 300,
    });
  });

  it("returns nulls instead of throwing for a completely unexpected shape", () => {
    expect(parseStacksFees({})).toEqual({
      lowPriority: null,
      mediumPriority: null,
      highPriority: null,
    });
    expect(parseStacksFees(null)).toEqual({
      lowPriority: null,
      mediumPriority: null,
      highPriority: null,
    });
  });

  it("fills in what it can find and leaves the rest null on a partial shape", () => {
    const body = { token_transfer: { low_priority: 150 } };
    expect(parseStacksFees(body)).toEqual({
      lowPriority: 150,
      mediumPriority: null,
      highPriority: null,
    });
  });
});
