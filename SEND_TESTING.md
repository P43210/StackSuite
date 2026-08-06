# Send pipeline — before you touch mainnet

This build adds real build/sign/broadcast for STX, BTC, and ETH sends
(`frontend/src/lib/wallet/send-{stacks,bitcoin,ethereum}.ts`), wired into
a confirmation-gated Send modal in the Wallet tab. **None of it has been
run against a live network from this sandbox** — the build environment
here has no outbound network access, so this could not be installed,
type-checked, or executed. What follows is written and cross-checked
against current library docs, not verified end-to-end. Treat it as a
strong first draft, not a tested pipeline.

## Do this before mainnet, per chain

1. `npm install` in `frontend/` and get it to actually compile
   (`npx tsc --noEmit`). This has not been done yet.
2. Fund a testnet address for each chain (Stacks testnet faucet, a
   Bitcoin testnet/signet faucet, Sepolia ETH faucet).
3. Run every case below on testnet, watching the real explorer, not
   just the app's own status text:
   - Normal send, confirm it lands at the right address for the right
     amount.
   - Send with insufficient balance — confirm the app blocks it
     client-side with a clear message, not a network-level rejection.
   - Send with the fee rate very low (BTC) — confirm it doesn't get
     stuck invisibly; you should be able to tell from the UI.
   - Kill your network mid-send — confirm the app fails clearly rather
     than showing a false "sent."
   - Double-click the confirm button — confirm only one transaction
     goes out (this is what `send-lock.ts` is for; verify it actually
     works, don't just trust the code).
4. For Bitcoin specifically: send from an address with multiple small
   UTXOs and confirm the change output and fee come out right — this
   is the single easiest place for a silent bug to overpay fees or
   miscount change. `selectUtxos` in `send-bitcoin.ts` uses a
   largest-first strategy with a 330-sat dust threshold; check that
   logic by hand against a real UTXO set before trusting it.
5. For Ethereum: confirm the nonce handling behaves if you fire two
   sends back to back, and check gas estimation against an actual
   congested-mempool moment, not just a quiet testnet.
6. Have someone other than whoever wrote this look at
   `send-bitcoin.ts` and `send-ethereum.ts` specifically — those are
   the two with the most room for a subtle miscalculation.

## What's still out of scope

Buy/Sell were correctly scoped as a fiat on/off-ramp integration
(MoonPay/Transak/Ramp, etc.), not a code problem — that still requires
picking a provider and going through partner/KYC onboarding regardless
of how fast the code ships. Not attempted here.

## What changed

- `frontend/src/lib/wallet/network-config.ts` — network selection,
  defaults to testnet everywhere, mainnet requires explicit opt-in
  (and, for ETH, an explicit RPC URL with no fallback).
- `frontend/src/lib/wallet/send-stacks.ts` — nonce fetch, build, sign,
  broadcast, poll via Hiro.
- `frontend/src/lib/wallet/send-bitcoin.ts` — UTXO fetch/selection,
  PSBT build via `@scure/btc-signer`, sign, broadcast, poll via
  mempool.space.
- `frontend/src/lib/wallet/send-ethereum.ts` — nonce + live EIP-1559
  fee data, sign, broadcast, poll via a JSON-RPC provider.
- `frontend/src/lib/wallet/send-lock.ts` — in-memory + localStorage
  guard against double-broadcast from a double-click or duplicate
  submit.
- `frontend/src/components/tabs/wallet/SendModal.tsx` — chain picker,
  amount/recipient form, a mandatory review screen showing exact
  amount/fee/destination before signing, then sign/broadcast/poll.
- `WalletTab.tsx` — Send button now opens the real modal instead of
  "coming soon." Buy/Sell unchanged.
