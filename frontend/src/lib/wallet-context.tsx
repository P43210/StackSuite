"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { connect, disconnect, isConnected, getLocalStorage } from "@stacks/connect";
import {
  isTelegramWebApp,
  getTelegramInitData,
  initializeTelegramWebApp,
} from "./telegram-webapp";
import {
  resolveTelegramIdentity,
  fetchLinkedWalletForAccount,
  linkWalletToAccount,
} from "./api";
import { trackWallet } from "./tracked-wallets";

type IdentitySource = "wallet" | "telegram" | "account" | null;

type WalletState = {
  connected: boolean;
  address: string | null;
  connecting: boolean;
  identitySource: IdentitySource;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
};

const WalletContext = createContext<WalletState | null>(null);

function readAddress(): string | null {
  try {
    const data = getLocalStorage();
    const stxAddress = data?.addresses?.stx?.[0]?.address;
    return stxAddress ?? null;
  } catch {
    return null;
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [identitySource, setIdentitySource] = useState<IdentitySource>(null);

  // Mirrors the latest identitySource into a ref so the storage/focus
  // revalidation handlers (registered once, on mount) always see the
  // current value instead of one captured in a stale closure.
  const identitySourceRef = useRef<IdentitySource>(null);
  useEffect(() => {
    identitySourceRef.current = identitySource;
  }, [identitySource]);

  // True once a real wallet session has been picked up this page load,
  // so an in-flight Telegram/account identity lookup that resolves
  // *after* the user has already connected a wallet manually doesn't
  // clobber it (a manual wallet connection always wins over those).
  const walletSessionActive = useRef(false);

  const applyWalletSession = useCallback((source: "init" | "revalidate") => {
    const stillConnected = isConnected();
    if (stillConnected) {
      const existingAddress = readAddress();
      walletSessionActive.current = true;
      setConnected(true);
      setAddress(existingAddress);
      setIdentitySource("wallet");
      if (source === "init" && existingAddress) {
        trackWallet(existingAddress, "Connected wallet", "connected");
      }
      return true;
    }

    // A wallet session existed before but doesn't anymore - either the
    // user disconnected in another tab, or the wallet extension revoked
    // access. Only a *wallet*-sourced identity gets cleared this way;
    // Telegram/account identities have no wallet session to lose.
    if (walletSessionActive.current && identitySourceRef.current === "wallet") {
      walletSessionActive.current = false;
      setConnected(false);
      setAddress(null);
      setIdentitySource(null);
    }
    return false;
  }, []);

  useEffect(() => {
    // A real wallet session always wins if one already exists locally,
    // regardless of whether we're inside Telegram or signed into an
    // account. Deferred a tick (still before the next paint) rather
    // than applied straight in the effect body, so this doesn't stack
    // a second synchronous render on top of the mount render.
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (applyWalletSession("init")) return;

      if (isTelegramWebApp()) {
        initializeTelegramWebApp();
        const initData = getTelegramInitData();
        if (initData) {
          resolveTelegramIdentity(initData)
            .then((result) => {
              // A manual wallet connection may have completed while this
              // request was in flight - don't overwrite it.
              if (walletSessionActive.current) return;
              if (result.linked && result.address) {
                setAddress(result.address);
                setConnected(true);
                setIdentitySource("telegram");
              }
            })
            .catch(() => {
              // Not linked yet, or resolution failed - fall through to
              // checking for a signed-in account's remembered address.
            });
        }
        return;
      }

      // Not in Telegram, no local wallet session: if signed in (Google
      // or email/password) and this account previously linked an
      // address, recognize it so returning users don't have to
      // reconnect a wallet just to view their own data again.
      fetchLinkedWalletForAccount()
        .then((result) => {
          if (walletSessionActive.current) return;
          if (result.address) {
            setAddress(result.address);
            setConnected(true);
            setIdentitySource("account");
          }
        })
        .catch(() => {
          // Not signed in, or no linked address yet - stays disconnected
          // until the user connects a wallet explicitly.
        });
    });
    return () => {
      cancelled = true;
    };
  }, [applyWalletSession]);

  useEffect(() => {
    // @stacks/connect has no accountsChanged/disconnect event emitter -
    // it only persists the session to localStorage. So we revalidate at
    // the two moments that matter in practice: another tab changing
    // that localStorage key (the "storage" event fires in *other* tabs
    // automatically), and this tab regaining focus/visibility after the
    // wallet extension's own popup may have been used to switch
    // accounts or revoke access.
    function handleStorage() {
      // @stacks/connect doesn't export its storage key publicly, and
      // re-checking isConnected() is just a cheap localStorage read, so
      // revalidate on any storage change rather than trying to filter
      // by key name.
      applyWalletSession("revalidate");
    }
    function handleFocus() {
      applyWalletSession("revalidate");
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") applyWalletSession("revalidate");
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [applyWalletSession]);

  const connectWallet = useCallback(async () => {
    // Guards against duplicate popups from a double-click or repeated
    // Enter key before the first request resolves.
    if (connecting || walletSessionActive.current) return;

    setConnecting(true);
    try {
      // Without a WalletConnect project ID, @stacks/connect can only see
      // wallets injected as a browser extension (window.LeatherProvider,
      // etc.) or the wallet's own in-app browser - a normal mobile Safari/
      // Chrome tab has neither, even if the wallet app is installed, so
      // it falls straight to "no wallet found". Passing a project ID adds
      // a real QR/deep-link path so an installed mobile wallet (Xverse
      // supports this on iOS and Android) can connect from any browser.
      const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
      await connect(projectId ? { walletConnectProjectId: projectId } : undefined);
      const newAddress = readAddress();
      walletSessionActive.current = true;
      setConnected(true);
      setAddress(newAddress);
      setIdentitySource("wallet");
      if (newAddress) trackWallet(newAddress, "Connected wallet", "connected");

      // Remember this address on the signed-in account for next time,
      // if there is one. A failure here (not signed in, DB unavailable)
      // is silent and non-fatal - the wallet is still connected for
      // this session either way.
      if (newAddress) {
        linkWalletToAccount(newAddress).catch(() => {});
      }
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  const disconnectWallet = useCallback(() => {
    // Only tears down a real wallet session. Telegram- or account-
    // resolved identities have no wallet session to disconnect - those
    // are unlinked through their own explicit flows instead (the
    // Telegram Bot tab's Disconnect button; there's no need for an
    // equivalent for the remembered account address, since connecting a
    // different wallet simply overwrites it).
    if (identitySource === "wallet") {
      disconnect();
    }
    walletSessionActive.current = false;
    setConnected(false);
    setAddress(null);
    setIdentitySource(null);
  }, [identitySource]);

  return (
    <WalletContext.Provider
      value={{ connected, address, connecting, identitySource, connectWallet, disconnectWallet }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
