"use client";

/**
 * Thin wrapper around Telegram's WebApp JS object, which only exists when
 * the page is opened inside Telegram (as a Mini App). In a normal browser,
 * window.Telegram is simply undefined - every function here checks for
 * that and no-ops or returns null rather than throwing, so this file is
 * always safe to import regardless of where the app is running.
 */

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { start_param?: string };
  ready: () => void;
  expand: () => void;
  colorScheme: "light" | "dark";
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function isTelegramWebApp(): boolean {
  return typeof window !== "undefined" && !!window.Telegram?.WebApp?.initData;
}

export function getTelegramInitData(): string | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp?.initData || null;
}

export function initializeTelegramWebApp(): void {
  if (typeof window === "undefined") return;
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return;
  webApp.ready();
  webApp.expand();
}
