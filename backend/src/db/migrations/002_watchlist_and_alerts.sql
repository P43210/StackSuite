-- Multi-asset-class watchlist and price alerts, keyed by the same
-- Stacks address used for the Telegram link, so alerts can reuse the
-- existing notification pipeline.

CREATE TABLE IF NOT EXISTS watchlist_items (
  id SERIAL PRIMARY KEY,
  stacks_address TEXT NOT NULL,
  asset_class TEXT NOT NULL CHECK (asset_class IN ('crypto', 'forex', 'commodity')),
  symbol TEXT NOT NULL,
  display_name TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stacks_address, asset_class, symbol)
);

CREATE TABLE IF NOT EXISTS price_alerts (
  id SERIAL PRIMARY KEY,
  stacks_address TEXT NOT NULL,
  asset_class TEXT NOT NULL CHECK (asset_class IN ('crypto', 'forex', 'commodity')),
  symbol TEXT NOT NULL,
  display_name TEXT NOT NULL,
  comparator TEXT NOT NULL CHECK (comparator IN ('above', 'below')),
  target_price NUMERIC NOT NULL,
  triggered BOOLEAN NOT NULL DEFAULT false,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_alerts_active_idx
  ON price_alerts (asset_class, symbol)
  WHERE NOT triggered;

-- Alerts are a new notification type on top of the existing Telegram
-- linking table; nothing to change there, 'price-alert' is just a new
-- value for event_subscriptions.event_type.
