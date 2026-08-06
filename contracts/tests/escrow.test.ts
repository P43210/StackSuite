import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const sender = accounts.get("wallet_1")!;
const recipient = accounts.get("wallet_2")!;
const arbiter = accounts.get("wallet_3")!;
const outsider = accounts.get("wallet_4")!;

const AMOUNT = 1_000_000; // 1 STX in microstacks
const FAR_FUTURE_HEIGHT = 999_999;

function createEscrow(
  overrides: Partial<{
    recipient: string;
    arbiter: string;
    amount: number;
    expirationHeight: number;
    sender: string;
  }> = {},
) {
  return simnet.callPublicFn(
    "escrow",
    "create-escrow",
    [
      Cl.principal(overrides.recipient ?? recipient),
      Cl.principal(overrides.arbiter ?? arbiter),
      Cl.uint(overrides.amount ?? AMOUNT),
      Cl.uint(overrides.expirationHeight ?? FAR_FUTURE_HEIGHT),
    ],
    overrides.sender ?? sender,
  );
}

describe("escrow: create-escrow", () => {
  it("locks STX in the contract and returns an incrementing id", () => {
    const first = createEscrow();
    expect(first.result).toBeOk(Cl.uint(0));

    const second = createEscrow();
    expect(second.result).toBeOk(Cl.uint(1));
  });

  it("rejects a zero amount", () => {
    const result = createEscrow({ amount: 0 });
    expect(result.result).toBeErr(Cl.uint(106));
  });

  it("rejects sender and recipient being the same principal", () => {
    const result = createEscrow({ recipient: sender });
    expect(result.result).toBeErr(Cl.uint(107));
  });

  it("rejects an expiration height that isn't in the future", () => {
    const currentHeight = simnet.burnBlockHeight;
    const result = createEscrow({ expirationHeight: currentHeight });
    expect(result.result).toBeErr(Cl.uint(108));
  });

  it("actually moves STX out of the sender's balance into the contract", () => {
    const balanceBefore = simnet.getAssetsMap().get("STX")?.get(sender) ?? 0n;
    createEscrow();
    const balanceAfter = simnet.getAssetsMap().get("STX")?.get(sender) ?? 0n;
    expect(balanceBefore - balanceAfter).toBe(BigInt(AMOUNT));
  });

  it("rejects new escrows while paused", () => {
    simnet.callPublicFn("escrow", "set-paused", [Cl.bool(true)], deployer);
    const result = createEscrow();
    expect(result.result).toBeErr(Cl.uint(101));
    simnet.callPublicFn("escrow", "set-paused", [Cl.bool(false)], deployer);
  });
});

describe("escrow: release-escrow", () => {
  it("lets the sender release funds to the recipient", () => {
    const created = createEscrow();
    const id = (created.result as any).value;

    const recipientBalanceBefore =
      simnet.getAssetsMap().get("STX")?.get(recipient) ?? 0n;

    const release = simnet.callPublicFn(
      "escrow",
      "release-escrow",
      [id as any],
      sender,
    );
    expect(release.result).toBeOk(Cl.bool(true));

    const recipientBalanceAfter =
      simnet.getAssetsMap().get("STX")?.get(recipient) ?? 0n;
    expect(recipientBalanceAfter - recipientBalanceBefore).toBe(BigInt(AMOUNT));
  });

  it("refuses to let anyone other than the sender release", () => {
    const created = createEscrow();
    const id = (created.result as any).value;

    const release = simnet.callPublicFn(
      "escrow",
      "release-escrow",
      [id as any],
      outsider,
    );
    expect(release.result).toBeErr(Cl.uint(103));
  });

  it("refuses to release the same escrow twice", () => {
    const created = createEscrow();
    const id = (created.result as any).value;

    simnet.callPublicFn("escrow", "release-escrow", [id as any], sender);
    const second = simnet.callPublicFn(
      "escrow",
      "release-escrow",
      [id as any],
      sender,
    );
    expect(second.result).toBeErr(Cl.uint(104));
  });

  it("errors cleanly for a nonexistent escrow id", () => {
    const result = simnet.callPublicFn(
      "escrow",
      "release-escrow",
      [Cl.uint(99999)],
      sender,
    );
    expect(result.result).toBeErr(Cl.uint(102));
  });
});

describe("escrow: refund-escrow", () => {
  it("lets the recipient voluntarily refund the sender", () => {
    const created = createEscrow();
    const id = (created.result as any).value;

    const senderBalanceBefore = simnet.getAssetsMap().get("STX")?.get(sender) ?? 0n;

    const refund = simnet.callPublicFn(
      "escrow",
      "refund-escrow",
      [id as any],
      recipient,
    );
    expect(refund.result).toBeOk(Cl.bool(true));

    const senderBalanceAfter = simnet.getAssetsMap().get("STX")?.get(sender) ?? 0n;
    expect(senderBalanceAfter - senderBalanceBefore).toBe(BigInt(AMOUNT));
  });

  it("refuses sender self-refund before expiration", () => {
    const created = createEscrow();
    const id = (created.result as any).value;

    const refund = simnet.callPublicFn(
      "escrow",
      "refund-escrow",
      [id as any],
      sender,
    );
    expect(refund.result).toBeErr(Cl.uint(103));
  });

  it("allows sender self-refund once expiration height has passed", () => {
    const nearHeight = simnet.burnBlockHeight + 3;
    const created = createEscrow({ expirationHeight: nearHeight });
    const id = (created.result as any).value;

    // mine blocks past expiration
    simnet.mineEmptyBurnBlocks(5);

    const refund = simnet.callPublicFn(
      "escrow",
      "refund-escrow",
      [id as any],
      sender,
    );
    expect(refund.result).toBeOk(Cl.bool(true));
  });
});

describe("escrow: dispute-escrow and resolve-dispute", () => {
  it("freezes the escrow when disputed, blocking release", () => {
    const created = createEscrow();
    const id = (created.result as any).value;

    const dispute = simnet.callPublicFn(
      "escrow",
      "dispute-escrow",
      [id as any],
      sender,
    );
    expect(dispute.result).toBeOk(Cl.bool(true));

    const releaseAttempt = simnet.callPublicFn(
      "escrow",
      "release-escrow",
      [id as any],
      sender,
    );
    expect(releaseAttempt.result).toBeErr(Cl.uint(104));
  });

  it("only the named arbiter can resolve a dispute", () => {
    const created = createEscrow();
    const id = (created.result as any).value;
    simnet.callPublicFn("escrow", "dispute-escrow", [id as any], sender);

    const wrongResolver = simnet.callPublicFn(
      "escrow",
      "resolve-dispute",
      [id as any, Cl.bool(true)],
      outsider,
    );
    expect(wrongResolver.result).toBeErr(Cl.uint(103));
  });

  it("arbiter can resolve toward the recipient", () => {
    const created = createEscrow();
    const id = (created.result as any).value;
    simnet.callPublicFn("escrow", "dispute-escrow", [id as any], recipient);

    const recipientBalanceBefore =
      simnet.getAssetsMap().get("STX")?.get(recipient) ?? 0n;

    const resolve = simnet.callPublicFn(
      "escrow",
      "resolve-dispute",
      [id as any, Cl.bool(true)],
      arbiter,
    );
    expect(resolve.result).toBeOk(Cl.bool(true));

    const recipientBalanceAfter =
      simnet.getAssetsMap().get("STX")?.get(recipient) ?? 0n;
    expect(recipientBalanceAfter - recipientBalanceBefore).toBe(BigInt(AMOUNT));
  });

  it("arbiter can resolve toward the sender", () => {
    const created = createEscrow();
    const id = (created.result as any).value;
    simnet.callPublicFn("escrow", "dispute-escrow", [id as any], sender);

    const senderBalanceBefore = simnet.getAssetsMap().get("STX")?.get(sender) ?? 0n;

    const resolve = simnet.callPublicFn(
      "escrow",
      "resolve-dispute",
      [id as any, Cl.bool(false)],
      arbiter,
    );
    expect(resolve.result).toBeOk(Cl.bool(true));

    const senderBalanceAfter = simnet.getAssetsMap().get("STX")?.get(sender) ?? 0n;
    expect(senderBalanceAfter - senderBalanceBefore).toBe(BigInt(AMOUNT));
  });
});

describe("escrow: pause controls", () => {
  it("only the contract owner (deployer) can toggle pause", () => {
    const attempt = simnet.callPublicFn(
      "escrow",
      "set-paused",
      [Cl.bool(true)],
      outsider,
    );
    expect(attempt.result).toBeErr(Cl.uint(100));
  });

  it("blocks release, refund, dispute, and resolve while paused", () => {
    const created = createEscrow();
    const id = (created.result as any).value;

    simnet.callPublicFn("escrow", "set-paused", [Cl.bool(true)], deployer);

    expect(
      simnet.callPublicFn("escrow", "release-escrow", [id as any], sender).result,
    ).toBeErr(Cl.uint(101));
    expect(
      simnet.callPublicFn("escrow", "refund-escrow", [id as any], recipient).result,
    ).toBeErr(Cl.uint(101));
    expect(
      simnet.callPublicFn("escrow", "dispute-escrow", [id as any], sender).result,
    ).toBeErr(Cl.uint(101));

    simnet.callPublicFn("escrow", "set-paused", [Cl.bool(false)], deployer);
  });
});
