import { WalletManager } from "@/lib/wallet/wallet-manager";
import { indexedDbStorage } from "@/lib/wallet/indexeddb-storage";

export const walletManager = new WalletManager(indexedDbStorage);

export type { MultiChainAccounts } from "@/lib/wallet/wallet-manager";
