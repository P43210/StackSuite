import { hashPassword } from "./password";

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("An account with this email already exists.");
  }
}

// Minimal shape of what we need from a MongoDB collection, so tests can
// pass a lightweight fake instead of needing a real database connection.
export interface UsersCollectionLike {
  findOne(filter: { email: string }): Promise<{ email: string } | null>;
  insertOne(doc: Record<string, unknown>): Promise<{ insertedId: unknown }>;
}

export async function registerAccount(
  usersCollection: UsersCollectionLike,
  email: string,
  password: string,
): Promise<{ email: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await usersCollection.findOne({ email: normalizedEmail });
  if (existing) {
    throw new EmailAlreadyRegisteredError();
  }

  const passwordHash = await hashPassword(password);

  await usersCollection.insertOne({
    email: normalizedEmail,
    passwordHash,
    emailVerified: null,
    linkedStacksAddress: null,
    createdAt: new Date(),
  });

  return { email: normalizedEmail };
}
