"use client";

import { useState } from "react";
import { LogOut, UserX } from "lucide-react";
import { deleteAccount, signOutAction } from "@/lib/auth-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeading } from "@/components/ui/PageHeading";
import { DangerAction } from "@/components/ui/DangerAction";

export function SettingsTab({ accountEmail }: { accountEmail: string | null }) {
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setSigningOut(true);
    // Not wrapped in try/catch: signOutAction() ends in signOut()'s
    // internal redirect throw on success - that signal must reach
    // Next.js rather than being caught here. No expected failure path
    // to show an error for.
    await signOutAction();
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setDeleteError(null);
    // Not wrapped in try/catch: a successful deletion ends in
    // signOut()'s internal redirect throw, which must reach Next.js's
    // own handling instead of being caught here - the same pattern
    // EmailSignInField uses for sign-in. A genuine failure returns
    // { error } instead of throwing, so that path is handled below.
    const result = await deleteAccount();
    setDeletingAccount(false);
    if (result?.error) setDeleteError(result.error);
  };

  return (
    <div>
      <PageHeading
        title="Settings"
        description="Manage your StackSuite account. Your on-device wallet and any watchlists or alerts aren't affected by anything here."
      />

      {accountEmail ? (
        <div className="space-y-5">
          <Card className="p-1">
            <div className="px-3 py-2.5 text-sm text-slate-mist border-b border-line">
              Signed in as <span className="text-chalk">{accountEmail}</span>
            </div>
            <div className="p-2">
              <Button
                variant="secondary"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full"
              >
                <LogOut size={15} />
                {signingOut ? "Signing out..." : "Log out"}
              </Button>
            </div>
          </Card>

          <div>
            <h3 className="text-xs font-mono uppercase tracking-wide text-slate-mist mb-2">
              Danger zone
            </h3>
            <Card className="p-1">
              <DangerAction
                label={
                  <span className="flex items-center gap-2">
                    <UserX size={15} />
                    Delete StackSuite account
                  </span>
                }
                confirmLabel="Delete account"
                description="This permanently deletes your StackSuite login and its linked wallet address. It does not touch this device's StackSuite Wallet or anything on-chain - only the account you sign in with. You'll be signed out immediately."
                onConfirm={handleDeleteAccount}
                busy={deletingAccount}
              />
              {deleteError && (
                <p className="px-3 pb-2.5 text-xs text-ember font-mono">{deleteError}</p>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <Card className="p-6">
          <p className="text-sm text-slate-mist">
            You&apos;re not signed into a StackSuite account in this session (using a wallet or
            Telegram identity instead), so there&apos;s no account to manage here.
          </p>
        </Card>
      )}
    </div>
  );
}
