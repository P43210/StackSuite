import { describe, expect, it } from "vitest";
import { registerAccount, EmailAlreadyRegisteredError, UsersCollectionLike } from "./register-account";
import { verifyPassword } from "./password";

function createFakeUsersCollection(): UsersCollectionLike & {
  docs: Record<string, unknown>[];
} {
  const docs: Record<string, unknown>[] = [];
  return {
    docs,
    async findOne(filter) {
      return (docs.find((d) => d.email === filter.email) as any) ?? null;
    },
    async insertOne(doc) {
      docs.push(doc);
      return { insertedId: docs.length };
    },
  };
}

describe("registerAccount", () => {
  it("creates a new account with a hashed password, never plaintext", async () => {
    const collection = createFakeUsersCollection();
    const result = await registerAccount(collection, "Alice@Example.com", "hunter2222");

    expect(result.email).toBe("alice@example.com");
    expect(collection.docs).toHaveLength(1);

    const stored = collection.docs[0] as any;
    expect(stored.email).toBe("alice@example.com");
    expect(stored.passwordHash).not.toBe("hunter2222");
    expect(await verifyPassword("hunter2222", stored.passwordHash)).toBe(true);
  });

  it("normalizes email case and whitespace before storing and checking", async () => {
    const collection = createFakeUsersCollection();
    await registerAccount(collection, "  Bob@Example.com  ", "password123");

    await expect(
      registerAccount(collection, "bob@example.com", "different-password"),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it("rejects registering the same email twice", async () => {
    const collection = createFakeUsersCollection();
    await registerAccount(collection, "carol@example.com", "password123");

    await expect(
      registerAccount(collection, "carol@example.com", "anotherpassword"),
    ).rejects.toThrow(EmailAlreadyRegisteredError);

    // Only one document should exist, not a second overwritten/duplicated one.
    expect(collection.docs).toHaveLength(1);
  });

  it("rejects a weak password before ever touching the collection", async () => {
    const collection = createFakeUsersCollection();
    await expect(registerAccount(collection, "dave@example.com", "short")).rejects.toThrow();
    expect(collection.docs).toHaveLength(0);
  });

  it("sets linkedStacksAddress to null for a brand new account", async () => {
    const collection = createFakeUsersCollection();
    await registerAccount(collection, "erin@example.com", "password123");
    expect((collection.docs[0] as any).linkedStacksAddress).toBeNull();
  });
});
