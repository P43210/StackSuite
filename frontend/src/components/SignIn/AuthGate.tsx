"use client";

import { useEffect, useState, ReactNode } from "react";
import { SignInGate } from "./SignInGate";
import {
  isTelegramWebApp,
  getTelegramInitData,
  initializeTelegramWebApp,
} from "@/lib/telegram-webapp";
import { resolveTelegramIdentity } from "@/lib/api";

type Status = "checking" | "allow" | "deny";

/**
 * Used only when there's no server-verified Google session. Checks
 * whether this is a Telegram Mini App open with an already-linked
 * identity - if so, that counts as signed in (Telegram itself already
 * vouched for the user), so the app renders without an extra Google
 * prompt. Everyone else sees the sign-in gate.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    if (isTelegramWebApp()) {
      initializeTelegramWebApp();
      const initData = getTelegramInitData();
      if (initData) {
        resolveTelegramIdentity(initData)
          .then((result) => setStatus(result.linked ? "allow" : "deny"))
          .catch(() => setStatus("deny"));
        return;
      }
    }
    // Deferred a tick (still before the next paint) rather than called
    // straight in the effect body, so this doesn't trigger a second
    // synchronous render pass on top of the mount render.
    queueMicrotask(() => setStatus("deny"));
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-mist text-sm font-mono">
        Loading...
      </div>
    );
  }

  if (status === "allow") return <>{children}</>;
  return <SignInGate />;
}
