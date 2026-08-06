;; escrow.clar
;; Locks STX from a sender for a recipient, released either by mutual
;; action or by an arbiter if the two sides disagree. Includes an
;; emergency pause switch controlled by the contract owner.

(define-constant CONTRACT-OWNER tx-sender)

;; error codes
(define-constant ERR-OWNER-ONLY (err u100))
(define-constant ERR-PAUSED (err u101))
(define-constant ERR-NOT-FOUND (err u102))
(define-constant ERR-NOT-AUTHORIZED (err u103))
(define-constant ERR-WRONG-STATUS (err u104))
(define-constant ERR-ZERO-AMOUNT (err u106))
(define-constant ERR-SAME-PARTIES (err u107))
(define-constant ERR-INVALID-EXPIRATION (err u108))

;; status values, kept as uints for compact storage
(define-constant STATUS-PENDING u0)
(define-constant STATUS-RELEASED u1)
(define-constant STATUS-REFUNDED u2)
(define-constant STATUS-DISPUTED u3)

(define-data-var is-paused bool false)
(define-data-var next-escrow-id uint u0)

(define-map escrows
  uint
  {
    sender: principal,
    recipient: principal,
    arbiter: principal,
    amount: uint,
    status: uint,
    expiration-height: uint
  }
)

;; --- read-only ---

(define-read-only (get-escrow (escrow-id uint))
  (map-get? escrows escrow-id)
)

(define-read-only (get-paused)
  (var-get is-paused)
)

(define-read-only (get-next-escrow-id)
  (var-get next-escrow-id)
)

;; --- owner controls ---

(define-public (set-paused (paused bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-OWNER-ONLY)
    (ok (var-set is-paused paused))
  )
)

;; --- core flows ---

;; Sender locks `amount` STX for `recipient`, with `arbiter` able to
;; resolve a dispute either way. `expiration-height` is a burn-chain
;; height after which the sender can reclaim funds unilaterally if the
;; recipient never acted.
(define-public (create-escrow
    (recipient principal)
    (arbiter principal)
    (amount uint)
    (expiration-height uint)
  )
  (let ((escrow-id (var-get next-escrow-id)))
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (not (is-eq tx-sender recipient)) ERR-SAME-PARTIES)
    (asserts! (> expiration-height burn-block-height) ERR-INVALID-EXPIRATION)

    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

    (map-set escrows escrow-id
      {
        sender: tx-sender,
        recipient: recipient,
        arbiter: arbiter,
        amount: amount,
        status: STATUS-PENDING,
        expiration-height: expiration-height
      }
    )
    (var-set next-escrow-id (+ escrow-id u1))
    (ok escrow-id)
  )
)

;; Sender releases funds to the recipient. Only the sender can do this
;; unilaterally, since they are the one giving up their claim to a refund.
(define-public (release-escrow (escrow-id uint))
  (let ((escrow (unwrap! (map-get? escrows escrow-id) ERR-NOT-FOUND)))
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts! (is-eq tx-sender (get sender escrow)) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get status escrow) STATUS-PENDING) ERR-WRONG-STATUS)

    (try! (as-contract (stx-transfer? (get amount escrow) tx-sender (get recipient escrow))))

    (map-set escrows escrow-id (merge escrow { status: STATUS-RELEASED }))
    (ok true)
  )
)

;; Recipient voluntarily refunds the sender (e.g. they can't fulfil their
;; side), or the sender reclaims funds themselves once the escrow has
;; expired with no action taken.
(define-public (refund-escrow (escrow-id uint))
  (let ((escrow (unwrap! (map-get? escrows escrow-id) ERR-NOT-FOUND)))
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts! (is-eq (get status escrow) STATUS-PENDING) ERR-WRONG-STATUS)
    (asserts!
      (or
        (is-eq tx-sender (get recipient escrow))
        (and
          (is-eq tx-sender (get sender escrow))
          (>= burn-block-height (get expiration-height escrow))
        )
      )
      ERR-NOT-AUTHORIZED
    )

    (try! (as-contract (stx-transfer? (get amount escrow) tx-sender (get sender escrow))))

    (map-set escrows escrow-id (merge escrow { status: STATUS-REFUNDED }))
    (ok true)
  )
)

;; Either party can flag a disagreement, freezing the escrow until the
;; arbiter resolves it. This exists so neither side can be forced into
;; releasing or refunding under a disputed circumstance.
(define-public (dispute-escrow (escrow-id uint))
  (let ((escrow (unwrap! (map-get? escrows escrow-id) ERR-NOT-FOUND)))
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts! (is-eq (get status escrow) STATUS-PENDING) ERR-WRONG-STATUS)
    (asserts!
      (or (is-eq tx-sender (get sender escrow)) (is-eq tx-sender (get recipient escrow)))
      ERR-NOT-AUTHORIZED
    )

    (map-set escrows escrow-id (merge escrow { status: STATUS-DISPUTED }))
    (ok true)
  )
)

;; Arbiter resolves a disputed escrow either to the recipient or back to
;; the sender. Only callable by the arbiter named at creation time.
(define-public (resolve-dispute (escrow-id uint) (release-to-recipient bool))
  (let ((escrow (unwrap! (map-get? escrows escrow-id) ERR-NOT-FOUND)))
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts! (is-eq tx-sender (get arbiter escrow)) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get status escrow) STATUS-DISPUTED) ERR-WRONG-STATUS)

    (if release-to-recipient
      (begin
        (try! (as-contract (stx-transfer? (get amount escrow) tx-sender (get recipient escrow))))
        (map-set escrows escrow-id (merge escrow { status: STATUS-RELEASED }))
      )
      (begin
        (try! (as-contract (stx-transfer? (get amount escrow) tx-sender (get sender escrow))))
        (map-set escrows escrow-id (merge escrow { status: STATUS-REFUNDED }))
      )
    )
    (ok true)
  )
)
