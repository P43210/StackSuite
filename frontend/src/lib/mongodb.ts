import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI ?? "";

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  // Deferred, not thrown at import time: lets the rest of the app build
  // and run (public pages, etc.) even before MONGODB_URI is configured.
  // Anything that actually awaits clientPromise will fail clearly at that
  // point instead of crashing the whole process on startup.
  clientPromise = Promise.reject(
    new Error("MONGODB_URI is not set. Add it to .env.local."),
  );
  // Silences Node's unhandled-rejection warning for the case where
  // nothing ever awaits this (e.g. a request that doesn't touch Mongo).
  // Doesn't affect the real rejection seen by anything that does await it.
  clientPromise.catch(() => {});
} else {
  // Reuse the client across hot-reloads in dev so we don't open a new
  // connection pool on every file change.
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
}

export default clientPromise;

export async function getDb() {
  const connectedClient = await clientPromise;
  return connectedClient.db();
}
