import { NextRequest, NextResponse } from "next/server";
import type { UpdateFilter } from "mongodb";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

// Deliberately does NOT extend mongodb's `Document` type. `Document`
// carries a `[key: string]: any` index signature, and when a schema
// interface extends it, the driver's mapped operator types ($pull,
// $addToSet, etc.) fall back to their generic "any key" branch instead
// of the specific `bnsWatchlist: string[]` branch - which is what
// produces the "Property 'bnsWatchlist' is incompatible with index
// signature" build error. A plain interface (no `extends`) keeps the
// operator types precise, and still satisfies Collection<TSchema>.
interface UserDoc {
  email: string;
  bnsWatchlist?: string[];
}

// Belt-and-suspenders on top of the fix above: build the update
// document as an explicitly-typed `UpdateFilter<UserDoc>` (bridged
// through `unknown`) rather than an inline object literal. Some
// versions of the driver's mapped operator types still misresolve
// $pull/$addToSet against an optional array field depending on how
// the object literal is contextually typed at the call site - typing
// it here, once, guarantees the shape is correct without depending on
// that inference succeeding at every call site.
function pullName(name: string): UpdateFilter<UserDoc> {
  return { $pull: { bnsWatchlist: name } } as unknown as UpdateFilter<UserDoc>;
}
function addName(name: string): UpdateFilter<UserDoc> {
  return { $addToSet: { bnsWatchlist: name } } as unknown as UpdateFilter<UserDoc>;
}

async function requireDb() {
  const session = await auth();
  if (!session?.user?.email) return { error: "not signed in" as const, status: 401 as const };
  try {
    const db = await getDb();
    return { collection: db.collection<UserDoc>("users"), email: session.user.email.toLowerCase() };
  } catch {
    return { error: "database unavailable" as const, status: 503 as const };
  }
}

export async function GET() {
  const ctx = await requireDb();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const user = await ctx.collection.findOne({ email: ctx.email });
  const names = user?.bnsWatchlist ?? [];
  return NextResponse.json({ names });
}

export async function POST(req: NextRequest) {
  const ctx = await requireDb();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => null);
  const name = body?.name;
  if (typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const normalized = name.trim().toLowerCase();

  await ctx.collection.updateOne({ email: ctx.email }, addName(normalized));

  return NextResponse.json({ name: normalized }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireDb();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const name = req.nextUrl.searchParams.get("name");
  if (typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  await ctx.collection.updateOne(
    { email: ctx.email },
    pullName(name.trim().toLowerCase()),
  );

  return new NextResponse(null, { status: 204 });
}
