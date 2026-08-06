import express from "express";
import cors from "cors";
import { config, assertProductionConfig } from "./config";
import { healthRouter } from "./routes/health";
import { chainhooksRouter } from "./routes/chainhooks";
import { portfolioRouter } from "./routes/portfolio";
import { telegramRouter } from "./routes/telegram";
import { escrowRouter } from "./routes/escrow";
import { yieldVaultRouter } from "./routes/yield-vault";
import { stackingRouter } from "./routes/stacking";
import { bnsRouter } from "./routes/bns";
import { wrappedRouter } from "./routes/wrapped";
import { marketRouter } from "./routes/market";
import { watchlistRouter } from "./routes/watchlist";
import { alertsRouter } from "./routes/alerts";
import { gasRouter } from "./routes/gas";
import { checkPriceAlerts } from "./lib/alert-checker";
import { getPool } from "./db/pool";
import { getRedis } from "./db/redis";

assertProductionConfig();

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use(healthRouter);
app.use(chainhooksRouter);
app.use(portfolioRouter);
app.use(telegramRouter);
app.use(escrowRouter);
app.use(yieldVaultRouter);
app.use(stackingRouter);
app.use(bnsRouter);
app.use(wrappedRouter);
app.use(marketRouter);
app.use(watchlistRouter);
app.use(alertsRouter);
app.use(gasRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "not found" });
});

app.listen(config.port, () => {
  console.log(`StackSuite backend listening on port ${config.port} (${config.nodeEnv})`);
});

const ALERT_CHECK_INTERVAL_MS = 60_000;
let alertCheckInFlight = false;

setInterval(async () => {
  if (alertCheckInFlight) return; // don't overlap if a check runs long
  const pool = getPool();
  const redis = getRedis();
  if (!pool || !redis) return;

  alertCheckInFlight = true;
  try {
    const triggered = await checkPriceAlerts(pool, redis);
    if (triggered > 0) {
      console.log(`[alert-checker] triggered ${triggered} alert(s)`);
    }
  } catch (err) {
    console.error("[alert-checker] check failed", err);
  } finally {
    alertCheckInFlight = false;
  }
}, ALERT_CHECK_INTERVAL_MS);
