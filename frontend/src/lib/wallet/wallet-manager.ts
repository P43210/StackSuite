import { generateNewMnemonic, isValidMnemonic, mnemonicToSeed, seedToRootKey } from "./mnemonic";
import { encryptMnemonic, decryptMnemonic, EncryptedPayload } from "./encryption";
import { deriveBitcoinAccount, BitcoinAccount } from "./bitcoin";
import { deriveEthereumAccount, EthereumAccount } from "./ethereum";
import { deriveStacksAccount, StacksAccount } from "./stacks";
import type { WalletStorage } from "./storage";

const STORAGE_KEY = "encrypted-wallet";

export class WalletAlreadyExistsError extends Error {
  constructor() {
    super("A wallet already exists on this device. Remove it first to create or import a new one.");
  }
}

export class InvalidMnemonicError extends Error {
  constructor() {
    super("That's not a valid recovery phrase. Check the words and try again.");
  }
}

export class NoWalletFoundError extends Error {
  constructor() {
    super("No wallet found on this device.");
  }
}

export interface MultiChainAccounts {
  stacks: StacksAccount;
  bitcoin: BitcoinAccount;
  ethereum: EthereumAccount;
}

async function deriveAllAccounts(
  mnemonic: string,
  network: "mainnet" | "testnet",
): Promise<MultiChainAccounts> {
  const seed = mnemonicToSeed(mnemonic);
  const rootKey = seedToRootKey(seed);
  return {
    stacks: await deriveStacksAccount(rootKey, network),
    bitcoin: deriveBitcoinAccount(rootKey),
    ethereum: deriveEthereumAccount(rootKey),
  };
}

export class WalletManager {
  constructor(private storage: WalletStorage) {}

  async hasStoredWallet(): Promise<boolean> {
    return (await this.storage.get(STORAGE_KEY)) !== null;
  }

  async createNew(
    network: "mainnet" | "testnet" = "mainnet",
  ): Promise<{ mnemonic: string; accounts: MultiChainAccounts }> {
    if (await this.hasStoredWallet()) {
      throw new WalletAlreadyExistsError();
    }
    const mnemonic = generateNewMnemonic(128);
    const accounts = await deriveAllAccounts(mnemonic, network);
    return { mnemonic, accounts };
  }

  async importExisting(
    mnemonic: string,
    network: "mainnet" | "testnet" = "mainnet",
  ): Promise<MultiChainAccounts> {
    if (await this.hasStoredWallet()) {
      throw new WalletAlreadyExistsError();
    }
    const normalized = mnemonic.trim().toLowerCase();
    if (!isValidMnemonic(normalized)) {
      throw new InvalidMnemonicError();
    }
    return deriveAllAccounts(normalized, network);
  }

  async persist(mnemonic: string, password: string): Promise<void> {
    const encrypted = await encryptMnemonic(mnemonic.trim().toLowerCase(), password);
    await this.storage.set(STORAGE_KEY, JSON.stringify(encrypted));
  }

  async unlock(
    password: string,
    network: "mainnet" | "testnet" = "mainnet",
  ): Promise<MultiChainAccounts> {
    const stored = await this.storage.get(STORAGE_KEY);
    if (!stored) throw new NoWalletFoundError();

    const encrypted = JSON.parse(stored) as EncryptedPayload;
    const mnemonic = await decryptMnemonic(encrypted, password);
    return deriveAllAccounts(mnemonic, network);
  }

  async removeFromDevice(): Promise<void> {
    await this.storage.delete(STORAGE_KEY);
  }
}
