import { auth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { WalletProvider } from "@/lib/wallet-context";
import { QueryProvider } from "@/lib/query-provider";
import { AuthGate } from "@/components/SignIn/AuthGate";

export default async function Home() {
  const session = await auth();
  const accountEmail = session?.user?.email ?? null;

  const app = (
    <QueryProvider>
      <WalletProvider>
        <AppShell accountEmail={accountEmail} />
      </WalletProvider>
    </QueryProvider>
  );

  // A verified Google session (checked server-side, no client flash)
  // gets straight through. Everyone else goes through AuthGate, which
  // also allows an already-linked Telegram Mini App identity.
  if (session) return app;

  return <AuthGate>{app}</AuthGate>;
}
