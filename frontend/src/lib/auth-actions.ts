"use server";

import { AuthError } from "next-auth";
import { signIn, signOut, auth } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { registerAccount, EmailAlreadyRegisteredError } from "@/lib/register-account";
import { WeakPasswordError } from "@/lib/password";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

type ActionResult = { error: string } | undefined;

export async function signInWithCredentials(
  email: string,
  password: string,
): Promise<ActionResult> {
  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    // Auth.js throws AuthError for a genuine auth failure (wrong password,
    // no such user). A successful sign-in throws a *different*, internal
    // Next.js redirect signal that must NOT be caught here - only AuthError
    // gets turned into a friendly message; anything else re-throws.
    if (error instanceof AuthError) {
      return { error: "Incorrect email or password." };
    }
    throw error;
  }
}

export async function registerAndSignIn(
  email: string,
  password: string,
): Promise<ActionResult> {
  try {
    const db = await getDb();
    await registerAccount(db.collection("users"), email, password);
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return { error: error.message };
    }
    if (error instanceof WeakPasswordError) {
      return { error: error.message };
    }
    return { error: "Could not create account. Try again shortly." };
  }

  // Registration succeeded - sign them in immediately rather than making
  // them submit the same credentials a second time.
  return signInWithCredentials(email, password);
}

/**
 * Permanently deletes the signed-in StackSuite account: the login
 * itself (email/password or Google), the record of which Stacks
 * address it had linked, and any Auth.js-managed session/OAuth-link
 * rows for it. Does not touch anything on-chain, the StackSuite
 * Wallet stored in this browser, or server-side watchlists/alerts
 * (those are keyed by wallet address or Telegram chat, not by this
 * account, so they aren't affected).
 *
 * Re-verifies the session itself server-side rather than trusting a
 * client-supplied identity, since this is destructive and irreversible.
 */
export async function deleteAccount(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "You're not signed in." };
  }
  const email = session.user.email.toLowerCase();

  try {
    const db = await getDb();
    const user = await db.collection("users").findOne({ email });
    if (user?._id) {
      // Best-effort: a credentials-only account has no adapter-managed
      // "accounts" (OAuth link) document, and there may be no live
      // "sessions" documents under the JWT session strategy - either
      // way, a missing collection or zero matches is fine here, this
      // is just cleanup of Auth.js's own bookkeeping, not the account
      // record itself.
      await db
        .collection("accounts")
        .deleteMany({ userId: user._id })
        .catch(() => {});
      await db
        .collection("sessions")
        .deleteMany({ userId: user._id })
        .catch(() => {});
    }
    await db.collection("users").deleteOne({ email });
  } catch {
    // A DB failure here must surface as a real error, not be mistaken
    // for the redirect signOut() throws below on success - deletion
    // genuinely didn't happen, so say so rather than going silent.
    return { error: "Could not delete your account right now. Try again shortly." };
  }

  // Clears the session cookie and redirects - throws internally like
  // signIn() does on success, so nothing after this line runs. Left
  // unguarded (like signInWithGoogle's signIn() call above) so that
  // internal signal reaches Next.js instead of being caught as an
  // error by the caller.
  await signOut({ redirectTo: "/" });
}
