;; mock-strategy.clar
;;
;; TEST FIXTURE ONLY. This does not integrate with any real DEX or
;; lending market and generates no actual yield. It exists purely so the
;; vault's deploy/withdraw-from-strategy flow can be tested against a
;; real trait implementation via simnet. A production deployment must
;; point the vault at an audited strategy contract instead, and the
;; owner should never approve this contract outside of a test network.

(impl-trait .yield-strategy-trait.yield-strategy-trait)

(define-data-var held-balance uint u0)

(define-public (deposit (amount uint))
  (begin
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (var-set held-balance (+ (var-get held-balance) amount))
    (ok amount)
  )
)

(define-public (withdraw (amount uint))
  (let ((current (var-get held-balance)) (recipient contract-caller))
    (asserts! (<= amount current) (err u1))
    (try! (as-contract (stx-transfer? amount tx-sender recipient)))
    (var-set held-balance (- current amount))
    (ok amount)
  )
)

(define-read-only (get-balance)
  (ok (var-get held-balance))
)
