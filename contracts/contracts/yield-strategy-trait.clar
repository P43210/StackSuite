;; yield-strategy-trait.clar
;; Any strategy the vault deploys funds into must implement this. Keeping
;; strategies behind a trait means the vault's own code never has to
;; change to support a new yield source, only the approved-strategy
;; pointer does, after the owner reviews and approves it.

(define-trait yield-strategy-trait
  (
    ;; Pull `amount` uSTX from the caller (the vault, via as-contract) into
    ;; this strategy. Returns the amount actually deposited.
    (deposit (uint) (response uint uint))

    ;; Send `amount` uSTX from this strategy back to the caller. Returns
    ;; the amount actually withdrawn.
    (withdraw (uint) (response uint uint))

    ;; Current uSTX value held by this strategy on the vault's behalf.
    (get-balance () (response uint uint))
  )
)
