import mongoose from "mongoose";
import { config } from "../config";

mongoose.set("bufferCommands", false);

let connectionPromise: Promise<typeof mongoose> | null = null;

export function getMongoConnection(): Promise<typeof mongoose> | null {
  if (!config.mongodbUri) return null;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
  }
  return connectionPromise;
}

export async function pingMongo(): Promise<"ok" | "unconfigured" | "unreachable"> {
  const connection = getMongoConnection();
  if (!connection) return "unconfigured";
  try {
    await connection;
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
    }
    return "ok";
  } catch {
    return "unreachable";
  }
}
