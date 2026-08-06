import { describe, expect, it } from "vitest";
import {
  WalletManager,
  WalletAlreadyExistsError,
  InvalidMnemonicError,
  NoWalletFoundError,
} from "./wallet-manager";
import type { WalletStorage } from "./storage";

function createFakeStorage(): WalletStorage {
  const store = new Map<string, string>();
  return {
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
  };
}

const VALID_IMPORT_MNEMONIC =
  "legal winner thank year wave sausage worth useful legal winner thank yellow";

describe("WalletManager: create flow", () => {
  it("creates a new wallet with a valid mnemonic and derived accounts for all three chains", async () => {
    const manager = new WalletManager(createFakeStorage());
    const { mnemonic, accounts } = await manager.createNew();

    expect(mnemonic.split(" ")).toHaveLength(12);
    expect(accounts.stacks.address).toMatch(/^SP/);
    expect(accounts.bitcoin.address).toMatch(/^bc1/);
    expect(accounts.ethereum.address).toMatch(/^0x/);
  });

  it("does not persist anything until persist() is explicitly called", async () => {
    const manager = new WalletManager(createFakeStorage());
    await manager.createNew();
    expect(await manager.hasStoredWallet()).toBe(false);
  });

  it("refuses to create a second wallet once one is persisted", async () => {
    const manager = new WalletManager(createFakeStorage());
    const { mnemonic } = await manager.createNew();
    await manager.persist(mnemonic, "a-strong-password");

    await expect(manager.createNew()).rejects.toThrow(WalletAlreadyExistsError);
  });
});

describe("WalletManager: persist and unlock", () => {
  it("unlocking with the right password returns the exact same accounts as creation", async () => {
    const manager = new WalletManager(createFakeStorage());
    const { mnemonic, accounts: createdAccounts } = await manager.createNew();
    await manager.persist(mnemonic, "correct-password");

    const unlockedAccounts = await manager.unlock("correct-password");
    expect(unlockedAccounts).toEqual(createdAccounts);
  });

  it("fails to unlock with the wrong password", async () => {
    const manager = new WalletManager(createFakeStorage());
    const { mnemonic } = await manager.createNew();
    await manager.persist(mnemonic, "correct-password");

    await expect(manager.unlock("wrong-password")).rejects.toThrow();
  });

  it("fails to unlock when no wallet has ever been persisted", async () => {
    const manager = new WalletManager(createFakeStorage());
    await expect(manager.unlock("any-password")).rejects.toThrow(NoWalletFoundError);
  });
});

describe("WalletManager: import flow", () => {
  it("imports a valid existing mnemonic and derives the correct accounts", async () => {
    const manager = new WalletManager(createFakeStorage());
    const accounts = await manager.importExisting(VALID_IMPORT_MNEMONIC);
    expect(accounts.stacks.address).toMatch(/^SP/);
    expect(accounts.bitcoin.address).toMatch(/^bc1/);
    expect(accounts.ethereum.address).toMatch(/^0x/);
  });

  it("rejects an invalid mnemonic before deriving anything", async () => {
    const manager = new WalletManager(createFakeStorage());
    await expect(manager.importExisting("not a real mnemonic at all")).rejects.toThrow(
      InvalidMnemonicError,
    );
  });

  it("refuses to import a second wallet once one is persisted", async () => {
    const storage = createFakeStorage();
    const manager = new WalletManager(storage);
    const { mnemonic } = await manager.createNew();
    await manager.persist(mnemonic, "a-password");

    await expect(manager.importExisting(VALID_IMPORT_MNEMONIC)).rejects.toThrow(
      WalletAlreadyExistsError,
    );
  });

  it("importing the same mnemonic twice (on different devices/managers) derives identical accounts", async () => {
    const manager1 = new WalletManager(createFakeStorage());
    const manager2 = new WalletManager(createFakeStorage());
    const accounts1 = await manager1.importExisting(VALID_IMPORT_MNEMONIC);
    const accounts2 = await manager2.importExisting(VALID_IMPORT_MNEMONIC);
    expect(accounts1).toEqual(accounts2);
  });
});

describe("WalletManager: removeFromDevice", () => {
  it("allows creating a new wallet again after removal", async () => {
    const manager = new WalletManager(createFakeStorage());
    const { mnemonic } = await manager.createNew();
    await manager.persist(mnemonic, "a-password");

    await manager.removeFromDevice();
    expect(await manager.hasStoredWallet()).toBe(false);

    await expect(manager.createNew()).resolves.toBeTruthy();
  });
});
