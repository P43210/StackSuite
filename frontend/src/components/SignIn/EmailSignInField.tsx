"use client";

import { useState, useTransition } from "react";
import { signInWithCredentials, registerAndSignIn } from "@/lib/auth-actions";

export function EmailSignInField({
  onPendingChange,
}: {
  onPendingChange?: (pending: boolean) => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    onPendingChange?.(true);
    startTransition(async () => {
      const action = mode === "signin" ? signInWithCredentials : registerAndSignIn;
      const result = await action(email, password);
      onPendingChange?.(false);
      if (result?.error) setError(result.error);
    });
  };

  const inputClass =
    "w-full rounded-lg bg-black/20 border border-line px-4 py-2.5 text-sm text-chalk placeholder:text-slate-dim focus:outline-none focus:border-indigo-light transition-colors";

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          required
          className={inputClass}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          required
          minLength={8}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg border border-line-strong px-4 py-2.5 text-sm font-medium text-chalk hover:border-indigo-light/60 hover:bg-white/[0.03] transition-colors disabled:opacity-60"
        >
          {isPending
            ? "Please wait..."
            : mode === "signin"
              ? "Continue with email"
              : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
        }}
        className="text-xs text-slate-mist hover:text-chalk transition-colors block mx-auto"
      >
        {mode === "signin"
          ? "No account yet? Create one"
          : "Already have an account? Sign in"}
      </button>

      {error && <p className="text-xs font-mono text-ember text-center">{error}</p>}
    </div>
  );
}
