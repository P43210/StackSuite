import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise, { getDb } from "./mongodb";
import { verifyPassword } from "./password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const db = await getDb();
        const user = await db
          .collection("users")
          .findOne({ email: email.toLowerCase() });

        if (!user?.passwordHash) {
          // Either no such user, or they signed up via Google and have
          // no password set - either way, credentials sign-in fails.
          return null;
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return { id: user._id.toString(), email: user.email, name: user.name };
      },
    }),
  ],
  pages: {
    signIn: "/",
  },
  // The MongoDB adapter's built-in "users" collection schema doesn't
  // include passwordHash/linkedStacksAddress by default, but it doesn't
  // mind them being present either - registerAccount() and the
  // wallet-link routes read/write those same documents directly.
});
