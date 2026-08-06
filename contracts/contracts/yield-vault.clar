;; yield-vault.clar
;;
;; NOT AUDITED. TESTNET ONLY.
;;
;; Scope of this version: this contract safely custodies user STX and
;; lets a keeper move idle funds into a single owner-approved strategy
;; contract and back. It deliberately does NOT yet distribute strategy
;; yield back into user balances - deposits are redeemable 1:1 for what
;; was put in. Turning "custody and reallocation" into a true
;; yield-compounding vault (share-price accounting that reflects
;; strategy profit) is follow-up work that needs its own careful design
;; and audit before this holds real money.
;;
;; Safety properties this contract is built to guarantee even if the
;; keeper key is compromised or misbehaves:
;;  - The keeper can only move funds into the single principal the
;;    contract owner has approved, never to an arbitrary address.
;;  - The keeper can never move a user's deposit out of the vault to
;;    anyone but back into the approved strategy (and back).
;;  - User withdrawals are never blocked by the pause switch. Pause
;;    only stops new deposits and new keeper deployments into a
;;    strategy; it never blocks a user reclaiming their own funds.
;;  - A withdrawal only fails if the vault doesn't currently hold
;;    enough idle STX to pay it, in which case the keeper (or the
;;    owner, by reassigning themselves as keeper) needs to pull
;;    liquidity back from the strategy, which is itself always allowed
;;    regardless of pause state.

(define-constant CONTRACT-OWNER tx-sender)

(use-trait yield-strategy-trait .yield-strategy-trait.yield-strategy-trait)

(define-constant ERR-OWNER-ONLY (err u200))
(define-constant ERR-KEEPER-ONLY (err u201))
(define-constant ERR-PAUSED (err u202))
(define-constant ERR-ZERO-AMOUNT (err u203))
(define-constant ERR-INSUFFICIENT-BALANCE (err u204))
(define-constant ERR-INSUFFICIENT-LIQUIDITY (err u205))
(define-constant ERR-WRONG-STRATEGY (err u207))
(define-constant ERR-INSUFFICIENT-IDLE (err u208))
(define-constant ERR-EXCEEDS-DEPLOYED (err u209))

(define-data-var keeper principal CONTRACT-OWNER)
(define-data-var approved-strategy (optional principal) none)
(define-data-var is-paused bool false)
(define-data-var total-deposits uint u0)
(define-data-var deployed-to-strategy uint u0)

(define-map balances principal uint)

;; --- read-only ---

(define-read-only (get-balance (who principal))
  (default-to u0 (map-get? balances who))
)

(define-read-only (get-total-deposits)
  (var-get total-deposits)
)

(define-read-only (get-idle-balance)
  (stx-get-balance (as-contract tx-sender))
)

(define-read-only (get-deployed-to-strategy)
  (var-get deployed-to-strategy)
)

(define-read-only (get-paused)
  (var-get is-paused)
)

(define-read-only (get-keeper)
  (var-get keeper)
)

(define-read-only (get-approved-strategy)
  (var-get approved-strategy)
)

;; --- owner controls ---

(define-public (set-keeper (new-keeper principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-OWNER-ONLY)
    (ok (var-set keeper new-keeper))
  )
)

(define-public (set-approved-strategy (new-strategy principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-OWNER-ONLY)
    (ok (var-set approved-strategy (some new-strategy)))
  )
)

(define-public (set-paused (paused bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-OWNER-ONLY)
    (ok (var-set is-paused paused))
  )
)

;; --- user flows ---

(define-public (deposit (amount uint))
  (begin
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)

    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

    (map-set balances tx-sender (+ (get-balance tx-sender) amount))
    (var-set total-deposits (+ (var-get total-deposits) amount))
    (ok amount)
  )
)

;; Intentionally not blocked by is-paused: pause stops new risk, it
;; never traps a user's own money.
(define-public (withdraw (amount uint))
  (let (
      (recipient tx-sender)
      (user-balance (get-balance tx-sender))
      (idle (stx-get-balance (as-contract tx-sender)))
    )
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (<= amount user-balance) ERR-INSUFFICIENT-BALANCE)
    (asserts! (<= amount idle) ERR-INSUFFICIENT-LIQUIDITY)

    (try! (as-contract (stx-transfer? amount tx-sender recipient)))

    (map-set balances recipient (- user-balance amount))
    (var-set total-deposits (- (var-get total-deposits) amount))
    (ok amount)
  )
)

;; --- keeper flows ---

(define-public (deploy-to-strategy (amount uint) (strategy <yield-strategy-trait>))
  (let ((idle (stx-get-balance (as-contract tx-sender))))
    (asserts! (is-eq tx-sender (var-get keeper)) ERR-KEEPER-ONLY)
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts!
      (is-eq (some (contract-of strategy)) (var-get approved-strategy))
      ERR-WRONG-STRATEGY
    )
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (<= amount idle) ERR-INSUFFICIENT-IDLE)

    (try! (as-contract (contract-call? strategy deposit amount)))

    (var-set deployed-to-strategy (+ (var-get deployed-to-strategy) amount))
    (ok amount)
  )
)

;; Always allowed regardless of pause, so liquidity can be restored for
;; user withdrawals even during an emergency.
(define-public (bring-liquidity (amount uint) (strategy <yield-strategy-trait>))
  (begin
    (asserts! (is-eq tx-sender (var-get keeper)) ERR-KEEPER-ONLY)
    (asserts!
      (is-eq (some (contract-of strategy)) (var-get approved-strategy))
      ERR-WRONG-STRATEGY
    )
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (<= amount (var-get deployed-to-strategy)) ERR-EXCEEDS-DEPLOYED)

    (try! (as-contract (contract-call? strategy withdraw amount)))

    (var-set deployed-to-strategy (- (var-get deployed-to-strategy) amount))
    (ok amount)
  )
)
