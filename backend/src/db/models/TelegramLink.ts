import mongoose, { Schema, InferSchemaType } from "mongoose";

const telegramLinkSchema = new Schema({
  stacksAddress: { type: String, required: true, unique: true },
  telegramChatId: { type: Number, required: true, unique: true },
  // Replaces the old event_subscriptions join table - a small, bounded
  // list per user is a natural fit for embedding rather than a separate
  // collection.
  subscriptions: { type: [String], default: [] },
  linkedAt: { type: Date, default: Date.now },
});

export type TelegramLinkDoc = InferSchemaType<typeof telegramLinkSchema>;

export const TelegramLink =
  mongoose.models.TelegramLink ||
  mongoose.model("TelegramLink", telegramLinkSchema);
