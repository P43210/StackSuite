import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { registerAccount, EmailAlreadyRegisteredError } from "@/lib/register-account";
import { assertPasswordStrength, WeakPasswordError } from "@/lib/password";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  try {
    assertPasswordStrength(password);
  } catch (err) {
    if (err instanceof WeakPasswordError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  let db;
  try {
    db = await getDb();
  } catch {
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }

  try {
    const result = await registerAccount(db.collection("users"), email, password);
    return NextResponse.json({ email: result.email }, { status: 201 });
  } catch (err) {
    if (err instanceof EmailAlreadyRegisteredError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof WeakPasswordError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[register] unexpected error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
