import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

const STX_PRINCIPAL_PATTERN = /^S[PT][0-9A-Z]{38,39}$/;
const VALID_SOURCES = new Set(["stacksuite-wallet", "watched", "connected"]);

type TrackedWallet = {
  address: string;
  label: string;
  source: string;
  addedAt: string;
};

async function requireDb() {
  const session = await auth();
  if (!session?.user?.email) return { error: "not signed in" as const, status: 401 as const };
  try {
    const db = await getDb();
    return { db, email: session.user.email.toLowerCase() };
  } catch {
    return { error: "database unavailable" as const, status: 503 as const };
  }
}

export async function GET() {
  const ctx = await requireDb();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const user = await ctx.db.collection("users").findOne({ email: ctx.email });
  const wallets = (user?.trackedWallets as TrackedWallet[] | undefined) ?? [];
  return NextResponse.json({ wallets });
}

// Upserts a single tracked wallet into the account's list (same
// dedupe-by-address behavior as the local-only version this mirrors).
export async function POST(req: NextRequest) {
  const ctx = await requireDb();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => null);
  const address = body?.address;
  const label = body?.label;
  const source = body?.source;
  if (typeof address !== "string" || !STX_PRINCIPAL_PATTERN.test(address)) {
    return NextResponse.json({ error: "invalid Stacks address" }, { status: 400 });
  }
  if (typeof label !== "string" || label.trim() === "") {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }
  if (typeof source !== "string" || !VALID_SOURCES.has(source)) {
    return NextResponse.json({ error: "invalid source" }, { status: 400 });
  }

  const entry: TrackedWallet = { address, label, source, addedAt: new Date().toISOString() };
  await ctx.db.collection("users").updateOne(
    { email: ctx.email },
    {
      // Remove any existing entry for this address, then push the
      // fresh one - the Mongo equivalent of the local dedupe-and-
      // replace behavior, done atomically in one round trip.
      $pull: { trackedWallets: { address } },
    },
  );
  await ctx.db.collection("users").updateOne(
    { email: ctx.email },
    { $push: { trackedWallets: entry } },
  );

  return NextResponse.json({ wallet: entry }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireDb();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const address = req.nextUrl.searchParams.get("address");
  if (typeof address !== "string" || !STX_PRINCIPAL_PATTERN.test(address)) {
    return NextResponse.json({ error: "invalid Stacks address" }, { status: 400 });
  }

  await ctx.db
    .collection("users")
    .updateOne({ email: ctx.email }, { $pull: { trackedWallets: { address } } });

  return new NextResponse(null, { status: 204 });
}
