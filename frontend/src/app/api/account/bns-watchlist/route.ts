import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

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
  const names = (user?.bnsWatchlist as string[] | undefined) ?? [];
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

  await ctx.db
    .collection("users")
    .updateOne({ email: ctx.email }, { $addToSet: { bnsWatchlist: normalized } });

  return NextResponse.json({ name: normalized }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireDb();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const name = req.nextUrl.searchParams.get("name");
  if (typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  await ctx.db
    .collection("users")
    .updateOne({ email: ctx.email }, { $pull: { bnsWatchlist: name.trim().toLowerCase() } });

  return new NextResponse(null, { status: 204 });
}
