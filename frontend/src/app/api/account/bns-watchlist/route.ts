import { NextRequest, NextResponse } from "next/server";
import { Document } from "mongodb";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

// Gives the driver enough shape info to type $addToSet/$pull against
// bnsWatchlist as a string array - without this, an untyped
// Collection<Document> can't tell a plain string apart from a Mongo
// query/filter object and the build fails type-checking.
interface UserDoc extends Document {
  email: string;
  bnsWatchlist?: string[];
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

  await ctx.collection.updateOne(
    { email: ctx.email },
    { $addToSet: { bnsWatchlist: normalized } },
  );

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
    { $pull: { bnsWatchlist: name.trim().toLowerCase() } },
  );

  return new NextResponse(null, { status: 204 });
}
