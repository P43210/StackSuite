import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

const STX_PRINCIPAL_PATTERN = /^S[PT][0-9A-Z]{38,39}$/;

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  let db;
  try {
    db = await getDb();
  } catch {
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }

  const user = await db
    .collection("users")
    .findOne({ email: session.user.email.toLowerCase() });

  return NextResponse.json({
    address: (user?.linkedStacksAddress as string | undefined) ?? null,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const address = body?.address;
  if (typeof address !== "string" || !STX_PRINCIPAL_PATTERN.test(address)) {
    return NextResponse.json({ error: "invalid Stacks address" }, { status: 400 });
  }

  let db;
  try {
    db = await getDb();
  } catch {
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }

  await db
    .collection("users")
    .updateOne(
      { email: session.user.email.toLowerCase() },
      { $set: { linkedStacksAddress: address } },
    );

  return NextResponse.json({ address });
}
