import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const alice = accounts.get("wallet_1")!;
const bob = accounts.get("wallet_2")!;
const keeper = accounts.get("wallet_3")!;
const outsider = accounts.get("wallet_4")!;

const mockStrategyPrincipal = `${deployer}.mock-strategy`;

function approveStrategyAndKeeper() {
  simnet.callPublicFn(
    "yield-vault",
    "set-approved-strategy",
    [Cl.principal(mockStrategyPrincipal)],
    deployer,
  );
  simnet.callPublicFn("yield-vault", "set-keeper", [Cl.principal(keeper)], deployer);
}

function deposit(amount: number, sender: string) {
  return simnet.callPublicFn("yield-vault", "deposit", [Cl.uint(amount)], sender);
}

function withdraw(amount: number, sender: string) {
  return simnet.callPublicFn("yield-vault", "withdraw", [Cl.uint(amount)], sender);
}

function stxBalance(who: string): bigint {
  return simnet.getAssetsMap().get("STX")?.get(who) ?? 0n;
}

describe("yield-vault: deposits", () => {
  it("mints a 1:1 redeemable balance and moves real STX into the vault", () => {
    const before = stxBalance(alice);
    const result = deposit(5_000_000, alice);
    expect(result.result).toBeOk(Cl.uint(5_000_000));

    const after = stxBalance(alice);
    expect(before - after).toBe(5_000_000n);

    const balance = simnet.callReadOnlyFn(
      "yield-vault",
      "get-balance",
      [Cl.principal(alice)],
      alice,
    );
    expect(balance.result).toBeUint(5_000_000);
  });

  it("tracks separate depositors independently", () => {
    deposit(1_000_000, alice);
    deposit(2_000_000, bob);

    expect(
      simnet.callReadOnlyFn("yield-vault", "get-balance", [Cl.principal(alice)], alice)
        .result,
    ).toBeUint(1_000_000);
    expect(
      simnet.callReadOnlyFn("yield-vault", "get-balance", [Cl.principal(bob)], bob)
        .result,
    ).toBeUint(2_000_000);
  });

  it("rejects a zero-amount deposit", () => {
    const result = deposit(0, alice);
    expect(result.result).toBeErr(Cl.uint(203));
  });

  it("blocks new deposits while paused", () => {
    simnet.callPublicFn("yield-vault", "set-paused", [Cl.bool(true)], deployer);
    const result = deposit(1_000_000, alice);
    expect(result.result).toBeErr(Cl.uint(202));
    simnet.callPublicFn("yield-vault", "set-paused", [Cl.bool(false)], deployer);
  });
});

describe("yield-vault: withdrawals", () => {
  it("pays out exactly what was deposited", () => {
    deposit(3_000_000, alice);
    const before = stxBalance(alice);

    const result = withdraw(3_000_000, alice);
    expect(result.result).toBeOk(Cl.uint(3_000_000));

    const after = stxBalance(alice);
    expect(after - before).toBe(3_000_000n);

    expect(
      simnet.callReadOnlyFn("yield-vault", "get-balance", [Cl.principal(alice)], alice)
        .result,
    ).toBeUint(0);
  });

  it("refuses to withdraw more than the caller deposited", () => {
    deposit(1_000_000, alice);
    const result = withdraw(2_000_000, alice);
    expect(result.result).toBeErr(Cl.uint(204));
  });

  it("refuses to withdraw someone else's balance", () => {
    deposit(1_000_000, alice);
    const result = withdraw(1_000_000, bob);
    expect(result.result).toBeErr(Cl.uint(204));
  });

  it("critical safety property: withdrawals work even while paused", () => {
    deposit(1_000_000, alice);
    simnet.callPublicFn("yield-vault", "set-paused", [Cl.bool(true)], deployer);

    const result = withdraw(1_000_000, alice);
    expect(result.result).toBeOk(Cl.uint(1_000_000));

    simnet.callPublicFn("yield-vault", "set-paused", [Cl.bool(false)], deployer);
  });
});

describe("yield-vault: strategy custody", () => {
  beforeEach(() => {
    approveStrategyAndKeeper();
  });

  it("keeper can deploy idle funds into the approved strategy", () => {
    deposit(10_000_000, alice);

    const result = simnet.callPublicFn(
      "yield-vault",
      "deploy-to-strategy",
      [Cl.uint(4_000_000), Cl.contractPrincipal(deployer, "mock-strategy")],
      keeper,
    );
    expect(result.result).toBeOk(Cl.uint(4_000_000));

    expect(
      simnet.callReadOnlyFn("yield-vault", "get-deployed-to-strategy", [], keeper)
        .result,
    ).toBeUint(4_000_000);
    expect(
      simnet.callReadOnlyFn("yield-vault", "get-idle-balance", [], keeper).result,
    ).toBeUint(6_000_000);
  });

  it("blocks anyone other than the keeper from deploying to strategy", () => {
    deposit(10_000_000, alice);
    const result = simnet.callPublicFn(
      "yield-vault",
      "deploy-to-strategy",
      [Cl.uint(1_000_000), Cl.contractPrincipal(deployer, "mock-strategy")],
      outsider,
    );
    expect(result.result).toBeErr(Cl.uint(201));
  });

  it("blocks deploying to a strategy that isn't the approved one", () => {
    deposit(10_000_000, alice);
    const result = simnet.callPublicFn(
      "yield-vault",
      "deploy-to-strategy",
      [Cl.uint(1_000_000), Cl.contractPrincipal(deployer, "escrow")],
      keeper,
    );
    // escrow doesn't implement the trait at all, so this fails at the
    // Clarity type-check level before even reaching our own assertion -
    // either way, funds must not move.
    expect(result.result).toBeErr(Cl.uint(207));
  });

  it("blocks new deployment into strategy while paused", () => {
    deposit(10_000_000, alice);
    simnet.callPublicFn("yield-vault", "set-paused", [Cl.bool(true)], deployer);

    const result = simnet.callPublicFn(
      "yield-vault",
      "deploy-to-strategy",
      [Cl.uint(1_000_000), Cl.contractPrincipal(deployer, "mock-strategy")],
      keeper,
    );
    expect(result.result).toBeErr(Cl.uint(202));
    simnet.callPublicFn("yield-vault", "set-paused", [Cl.bool(false)], deployer);
  });

  it("full round trip: deploy then bring back liquidity, funds conserved", () => {
    deposit(10_000_000, alice);

    simnet.callPublicFn(
      "yield-vault",
      "deploy-to-strategy",
      [Cl.uint(6_000_000), Cl.contractPrincipal(deployer, "mock-strategy")],
      keeper,
    );

    const bringBack = simnet.callPublicFn(
      "yield-vault",
      "bring-liquidity",
      [Cl.uint(6_000_000), Cl.contractPrincipal(deployer, "mock-strategy")],
      keeper,
    );
    expect(bringBack.result).toBeOk(Cl.uint(6_000_000));

    expect(
      simnet.callReadOnlyFn("yield-vault", "get-deployed-to-strategy", [], keeper)
        .result,
    ).toBeUint(0);
    expect(
      simnet.callReadOnlyFn("yield-vault", "get-idle-balance", [], keeper).result,
    ).toBeUint(10_000_000);

    // Alice can still withdraw everything she put in.
    const result = withdraw(10_000_000, alice);
    expect(result.result).toBeOk(Cl.uint(10_000_000));
  });

  it("critical safety property: bringing liquidity back works even while paused", () => {
    deposit(10_000_000, alice);
    simnet.callPublicFn(
      "yield-vault",
      "deploy-to-strategy",
      [Cl.uint(5_000_000), Cl.contractPrincipal(deployer, "mock-strategy")],
      keeper,
    );

    simnet.callPublicFn("yield-vault", "set-paused", [Cl.bool(true)], deployer);

    const result = simnet.callPublicFn(
      "yield-vault",
      "bring-liquidity",
      [Cl.uint(5_000_000), Cl.contractPrincipal(deployer, "mock-strategy")],
      keeper,
    );
    expect(result.result).toBeOk(Cl.uint(5_000_000));

    simnet.callPublicFn("yield-vault", "set-paused", [Cl.bool(false)], deployer);
  });

  it("a withdrawal larger than idle liquidity fails cleanly instead of partially paying", () => {
    deposit(10_000_000, alice);
    simnet.callPublicFn(
      "yield-vault",
      "deploy-to-strategy",
      [Cl.uint(8_000_000), Cl.contractPrincipal(deployer, "mock-strategy")],
      keeper,
    );

    // Only 2,000,000 idle remains; Alice is owed 10,000,000.
    const result = withdraw(10_000_000, alice);
    expect(result.result).toBeErr(Cl.uint(205));

    // Partial withdrawal within idle liquidity still works.
    const partial = withdraw(2_000_000, alice);
    expect(partial.result).toBeOk(Cl.uint(2_000_000));
  });
});

describe("yield-vault: owner controls", () => {
  it("only the owner can set the keeper", () => {
    const result = simnet.callPublicFn(
      "yield-vault",
      "set-keeper",
      [Cl.principal(outsider)],
      outsider,
    );
    expect(result.result).toBeErr(Cl.uint(200));
  });

  it("only the owner can set the approved strategy", () => {
    const result = simnet.callPublicFn(
      "yield-vault",
      "set-approved-strategy",
      [Cl.principal(mockStrategyPrincipal)],
      outsider,
    );
    expect(result.result).toBeErr(Cl.uint(200));
  });

  it("only the owner can pause", () => {
    const result = simnet.callPublicFn(
      "yield-vault",
      "set-paused",
      [Cl.bool(true)],
      outsider,
    );
    expect(result.result).toBeErr(Cl.uint(200));
  });
});
