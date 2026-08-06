# StackSuite

Bitcoin-secured tools and full market intelligence, in one app — plus a
Telegram Mini App that's the same app, running inside Telegram.

> **This update replaced two of the original four core tools and added
> several new features. See "What changed in this update" below before
> reading the rest of this README if you worked with an earlier version.**

## What's in here

**Core Stacks tools**
- **BNS Names** — resolve any `.btc`/`.stx` name to its owner and
  expiration, see which names your wallet owns, and keep a watchlist of
  names to track for upcoming expiry. Replaces the original Escrow dApp.
- **Telegram Event Bot** — get notified in Telegram about on-chain activity
  tied to your wallet, and use the same link to sign into the Mini App.
- **Portfolio Tracker** — read-only STX and token balances, with a
  switcher across every wallet you're tracking (connected, StackSuite
  Wallet, or manually watched).
- **Compare Wallets** — put up to 5 Stacks addresses side by side and
  compare STX balances and token counts at a glance.
- **Stacking Monitor** — read-only view of active PoX stacking (locked
  STX, unlock height, current cycle) across your tracked wallets. Replaces
  the original Yield Manager vault — StackSuite no longer custodies or
  reallocates anyone's funds; it only reports on stacking that's already
  happening on-chain.

**Markets, Tools, Tracking** — live prices, top movers, Fear & Greed,
multi-chain gas fees, a converter/profit/position-size calculator set,
and a crypto/forex/metals watchlist with Telegram price alerts.

**StackSuite Wallet** — a non-custodial, multi-chain (Stacks, Bitcoin,
Ethereum) wallet built into the app. Create a new one or import via
mnemonic. Keys are generated and encrypted client-side only; nothing
touches the backend. Its Stacks address is automatically tracked in
Portfolio and available in Compare Wallets the moment you create, import,
or unlock it — no manual step needed.

**Sign-in** — Google, email/password, or an already-linked Telegram
identity inside the Mini App. Nothing is browsable until signed in.

**Theme** — dark (default) and light, toggle in the sidebar/mobile header.
Persists across visits.

## What changed in this update

1. **Yield Manager → Stacking Monitor.** The vault-custody contract UI
   (deposit/withdraw/keeper reallocation) has been removed from the
   frontend entirely, replaced by a read-only PoX stacking monitor. The
   `yield-vault.clar` contract and its backend routes (`/api/yield-vault/*`)
   still exist if you want to redeploy and build your own UI on top of
   them, but nothing in the app surfaces them anymore.
2. **Dark/light theme.** New CSS variable set for light mode (re-tuned
   brand colors, not a flat inversion), a blocking init script so there's
   no flash of the wrong theme on load, and a toggle button.
3. **Escrow → BNS Names + Watchlist.** The Escrow dApp UI has been
   removed. `escrow.clar` and `/api/escrow/*` still exist server/contract
   -side, unused by the frontend. New backend routes: `GET
   /api/bns/resolve/:name` and `GET /api/bns/owned/:address`, proxying
   Hiro's BNS API (`/v1/names/{name}`, `/v1/addresses/stacks/{address}`).
4. **Mobile wallet connection fixed.** Root cause: `@stacks/connect`
   only detects wallets injected as a browser extension or running inside
   the wallet's own in-app browser — a normal mobile browser tab has
   neither, even with the wallet app installed, so it always fell through
   to "no wallet found." Fix: `connectWallet()` now passes a
   `walletConnectProjectId` when `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is
   set, which gives `@stacks/connect` v8 a real QR/deep-link path to an
   installed mobile wallet (Xverse supports this on iOS and Android). Get
   a free project ID at [cloud.reown.com](https://cloud.reown.com) — until
   it's set, the connect button shows an inline note explaining why mobile
   connection is limited.
5. **Compare Wallets**, new tab — up to 5 Stacks addresses at once, quick-
   add from your tracked wallets or paste any address manually.
6. **Favicon fixed.** The root cause: `frontend/src/app/favicon.ico` was
   the unedited default Next.js/Vercel triangle icon — it was never
   actually replaced with the StackSuite mark, which is why Vercel's icon
   kept showing regardless of hosting. Regenerated the real StackSuite
   mark at all needed sizes (`favicon.ico`, `icon.png`, `apple-icon.png`,
   plus a web manifest) and added explicit `icons` metadata in
   `layout.tsx`. If you still see a stale icon after redeploying, that's
   your browser or CDN cache, not the app — hard-refresh or check in a
   private window.
7. **StackSuite Wallet addresses are now tracked.** Creating, importing,
   or unlocking a wallet in the Wallet tab registers its Stacks address
   into the same tracked-wallets list Portfolio and Compare Wallets read
   from (public address only, stored in `localStorage`, nothing sensitive).

**Wallet Wrapped** — a shareable stat card for any Stacks address: STX
balance, transaction count, tokens held, and stacking status, rendered
entirely in-browser as a downloadable PNG (canvas-based, no external
image service, nothing uploaded anywhere).

**Tip Jar** — every wallet (StackSuite Wallet, connected wallet, or a
resolved BNS name's owner) gets a QR code + shareable link
(`/tip/<address>`) for receiving STX. The tip page itself is public and
not behind the sign-in gate, so it works for anyone you send the link to,
even without a StackSuite account. Paying from the page uses the payer's
own wallet via `@stacks/connect`'s `stx_transferStx` request.

## Layout

```
frontend/       Next.js app: all product tabs, Auth.js (Google/email),
                the StackSuite Wallet, Telegram Mini App integration
backend/        Express API: chainhook intake, read-only proxies to
                Hiro/CoinGecko/BNS/etc, price alert checking
telegram-bot/   grammY bot service, separate long-running process
contracts/      Clarity contracts (escrow, yield-vault - both now
                unused by the frontend, kept for reference/redeployment)
docker-compose.yml   Local Postgres, Redis, MongoDB for development
```

### Where data lives, and why

- **Postgres** (backend): watchlist items, price alerts — relational,
  worked well as-is, left alone.
- **MongoDB, backend instance**: Telegram chat-to-address links. Reused
  by chainhook/alert notification lookups.
- **MongoDB, frontend instance** (same physical server, can be the same
  database): user accounts (Google/email), each account's remembered
  Stacks address. Managed via Auth.js's MongoDB adapter.
- **Redis**: short-lived link codes, notification pub/sub.
- **Nothing, ever**: the StackSuite Wallet's mnemonic and private keys.
  Client-side only, by design — see the Wallet section below.

## Local setup

### 1. Postgres, Redis, MongoDB

```bash
docker compose up -d
```

Runs `backend/src/db/migrations/*.sql` against Postgres on first boot.
Without Docker, start your own instances and run those migration files
manually.

### 2. Backend

```bash
cd backend
cp .env.example .env   # edit as needed
npm install
npm run dev
```

Check `http://localhost:4000/health` — `postgres`, `mongo`, and `redis`
should all report `ok`.

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # edit as needed
npm install
npm run dev
```

Open `http://localhost:3000`. You'll land on the sign-in gate first —
see Auth setup below to make Google/email actually work.

Note: `dev` and `build` are pinned to `--webpack`. Turbopack's SSR
bundling fails on `@stacks/connect`'s module structure as of the
versions this was built against — webpack works correctly.

### 4. Telegram bot

Requires a bot token from [@BotFather](https://t.me/BotFather).

```bash
cd telegram-bot
cp .env.example .env   # TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_SHARED_SECRET
                        # must match backend/.env exactly
npm install
npm run dev
```

`TELEGRAM_BOT_SHARED_SECRET` must match the backend's value.

### 5. Contracts

```bash
# macOS
brew install clarinet
# other platforms: https://docs.hiro.so/clarinet/getting-started
```

```bash
cd contracts
npm install
npx vitest run      # full suite against simnet
clarinet check
```

## Auth setup (Google + email/password)

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth
   Client ID** (type: Web application).
2. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   for local dev, plus your production domain's equivalent once deployed.
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in `frontend/.env.local`.
4. `AUTH_SECRET` is already generated for local dev — generate a fresh one
   for production: `openssl rand -base64 32`.

Email/password needs no external service — it's backed by MongoDB
directly.

## Mobile wallet connection

Get a free WalletConnect project ID at
[cloud.reown.com](https://cloud.reown.com) (Reown is WalletConnect's
current name) and set:

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
```

Without it, "Connect wallet" only finds browser-extension wallets and a
wallet's own in-app browser — it will not see an installed mobile wallet
app from a regular mobile browser tab, which is the "I have a wallet but
it says install one" issue. With it set, mobile users get a real QR/deep-
link connection path.

## Setting up the Telegram Mini App

The Mini App is the same Next.js frontend, running inside Telegram's
webview. Nothing to build separately — three steps to wire it up:

**1. Deploy the frontend somewhere with a public HTTPS URL.**
Vercel is the path of least resistance for a Next.js app: connect the
repo, set the same environment variables as your local `.env.local`
(plus real `GOOGLE_CLIENT_ID`/`SECRET`, a production `AUTH_SECRET`, and
your real `MONGODB_URI`), and deploy. Add
`https://<your-domain>/api/auth/callback/google` as an additional
authorized redirect URI in Google Cloud Console.

**2. Attach the Mini App to your bot via @BotFather:**
- Message [@BotFather](https://t.me/BotFather) → `/mybots` → select your
  bot → **Bot Settings** → **Menu Button** (or **Configure Mini App** →
  **Enable Mini App**, depending on which BotFather revision you see).
- Enter your deployed URL (`https://<your-domain>`) and a short button
  title (e.g. "Open StackSuite").
- The bot's chat now shows an "Open App" / menu button that launches the
  Mini App directly.

**3. Set the frontend's bot username** so the in-app deep link (shown on
the Telegram Bot tab) points at the right place:

```
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=YourBotUsername
```

That's it — no separate manifest, no app store submission. Opening the
bot and tapping the menu button loads the live site inside Telegram;
tapping the "Open in Telegram to link automatically" deep link
(`t.me/<bot>?startapp=<code>`) auto-links a signed-in web session to
that Telegram account on first open.

**What to verify once deployed**, since none of this could be exercised
from the sandbox this was built in:
- The menu button actually opens the app inside Telegram
- A fresh link code, generated on the website, actually auto-links when
  opened via the deep link
- Wallet-signing actions in general — Telegram's in-app browser can't
  run wallet extensions, so expect wallet-connect to behave differently
  inside the Mini App than on the open web; that's a platform limitation,
  not something disabled on purpose

## Deploying contracts

`escrow.clar` and `yield-vault.clar` are no longer used by the frontend,
but still live under `contracts/` with their full Clarinet + vitest test
suite if you want to redeploy and build your own UI against them. Use
Clarinet's deployment plans or the Hiro Platform, then set
`ESCROW_CONTRACT_ADDRESS`/`YIELD_VAULT_CONTRACT_ADDRESS` (backend) and
`NEXT_PUBLIC_ESCROW_CONTRACT`/`NEXT_PUBLIC_YIELD_VAULT_CONTRACT` (frontend)
if you build something that reads them. For the yield vault, also call
`set-approved-strategy` and `set-keeper` as the contract owner first.
`mock-strategy.clar` is a **test fixture only** — never point a real
deployment at it.

## Registering chainhooks

The notification pipeline depends on Hiro Chainhooks calling
`POST /chainhooks/events` with an `Authorization` header matching
`CHAINHOOK_SHARED_SECRET`. The exact payload shape was reconstructed
from Stacks' documented event schema, not confirmed against a live
payload — check `backend/src/lib/notify.ts`'s `extractStxTransfers`
against a real payload before relying on it in production.

## The StackSuite Wallet, specifically

Non-custodial by design, held to strictly:
- Mnemonic generation, seed derivation, and multi-chain key derivation
  are verified against official test vectors (BIP-39's Trezor vector,
  SLIP-0132's Bitcoin vector, and cross-validated against `ethers.js`'s
  own independent implementation for Ethereum) — see
  `frontend/src/lib/wallet/*.test.ts`.
- Encrypted at rest with AES-256-GCM + PBKDF2, using the Web Crypto API.
  The wallet's encryption password is separate from your account login
  password — losing it, with no other backup of the mnemonic, means
  permanent loss of funds. That's the standard self-custody model, the
  same as any other wallet, not a bug.
- Nothing here has been through an external security review yet.
  Treat it as testnet/small-amounts only until it has.

## What's verified and what isn't

Verified when originally built (network/build access was available then):
- 37 Clarity contract tests against Clarinet's simnet (escrow + yield
  vault, every authorization rule, the pause/withdrawal safety property)
- 41 wallet tests, including byte-exact matches against official BIP-39/
  SLIP-0132 vectors and cross-validation against an independent library
- Backend routes exercised against real local Postgres, Redis, and the
  logic layer of MongoDB-backed routes
- initData signature validation tested with genuinely signed payloads,
  including against the real bot token
- 76 frontend + 29 backend + 37 contract tests, all passing; all four
  services build and type-check cleanly

**This update's session had no network access and no `node_modules`
available at all** — `npm install` couldn't run, so nothing new could be
built, type-checked with real type definitions, or tested. Every change
in "What changed in this update" above was verified only by:
- A syntax-only TypeScript parse (`tsc --noEmit`, ignoring missing-module
  errors) across every changed/new file, catching real parse errors
  (mismatched brackets, malformed JSX, typos in control flow) but not
  type errors that depend on a package's actual exported shape
- Careful manual read-through of each file for import correctness and
  logical consistency
- Cross-referencing new API usage (`@stacks/connect`'s
  `walletConnectProjectId` option, Hiro's `/v1/names/{name}` and `/v2/pox`
  endpoints) against current documentation via web search, not a live call

**Run `npm install && npm run build && npm test` in each of
`frontend/`, `backend/`, and `contracts/` yourself before deploying this** —
that's the one verification step this update genuinely could not do.

Also not yet verified, because it requires infrastructure or access this
was built without:
- No contract deployed to testnet; no real transaction signed by a
  real wallet extension
- No live MongoDB server exists in the sandbox this was built in — the
  connection code and query logic are correct and tested via fakes,
  not proven against a real database round trip
- No live Google OAuth flow completed (needs a real browser hitting
  `accounts.google.com`, unreachable from the build sandbox)
- No real Telegram message delivered (bot never reached
  `api.telegram.org`) — though the full linking logic was verified
  against the real bot token everywhere short of that final send
- No real headless browser was available to literally screenshot the
  UI, in either the original design pass or this update — light theme,
  the new tabs, and mobile wallet connect are all unverified visually
- The BNS and PoX endpoint response shapes (`/v1/names/{name}`,
  `/v1/addresses/stacks/{address}`, `/v2/pox`) are implemented from
  documentation, not confirmed against a live response — check
  `backend/src/routes/bns.ts` and `backend/src/routes/stacking.ts`
  against real output before relying on them
- Wallet Wrapped's transaction-count/oldest-transaction logic
  (`backend/src/routes/wrapped.ts`) parses Hiro's
  `/extended/v1/address/{principal}/transactions` defensively (handles a
  couple of plausible response shapes) but hasn't been checked against a
  live response either
- Tip Jar's QR codes are generated by a public third-party image endpoint
  (api.qrserver.com, no API key) rather than a bundled QR library, to
  avoid adding a new dependency this session couldn't `npm install` to
  verify — swap in a real QR library later if you'd rather not depend on
  it. The `stx_transferStx` request itself was implemented from current
  `@stacks/connect` documentation, not exercised against a live wallet.

Before either the escrow or yield vault contract holds real money, or
the Wallet handles anything beyond testnet/small amounts, get an
external security review. Passing this test suite is necessary, not
sufficient.
