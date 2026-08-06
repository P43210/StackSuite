-- StackSuite shared schema, applied to the Postgres instance shared by
-- the backend and the Telegram bot service.

CREATE TABLE IF NOT EXISTS telegram_links (
  stacks_address TEXT PRIMARY KEY,
  telegram_chat_id BIGINT NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A single chat can only be linked to one address at a time; re-linking
-- moves the chat, it doesn't create a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS telegram_links_chat_id_idx
  ON telegram_links (telegram_chat_id);

CREATE TABLE IF NOT EXISTS event_subscriptions (
  id SERIAL PRIMARY KEY,
  stacks_address TEXT NOT NULL REFERENCES telegram_links (stacks_address) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stacks_address, event_type)
);
