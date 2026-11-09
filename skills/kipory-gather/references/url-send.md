# Telling an outside system something

Read this before a flow writes to an outside system with `url.send`.

## Telling an outside system something: `url.send`

`url.send` is not a read. It sends a POST, PUT, PATCH or DELETE to an outside system; never reach
for `url.fetch` to do that, because a read is cached and may be sent several times.

⚠️ **A flow cannot branch on what the outside system answered.** The request leaves after the run
has saved, so the step answers only `true` (staged). When what happens next depends on the answer
— a charge paid or declined — the system must call back: the sending flow keeps a keyed attempt
record and sends its key, and an endpoint the system calls settles it (see "Acting on the
answer" below).

- **Staged once per run, delivered after the run has saved everything else.** A run that fails
  sends nothing, and the flow never sees the answer.
- **The receiver may see a request twice.** A transient failure — no answer, a 5xx, a 429 — is
  retried for about ten minutes, every attempt with the same `Idempotency-Key` header. A 3xx or
  4xx is final: a redirect is not followed. A new run of the same input stages a new request;
  name an `idempotencyKey` so the receiving system can recognise that repeat too.
  <!-- field-ok: idempotencyKey — a `url.send` config field, listed on the function's reference page -->
- **In a preview or an eval run the step checks and does not send.** It answers `true` with a
  `PREVIEWED_NOT_SENT` warning naming the method and host, and the rest of the flow runs. A secret
  that is not stored fails it as `api-key-missing`, and an address outside the secret's hosts fails
  it as the delivery would. Prove the delivery with one live run.
- **Nothing reports the delivery.** The step's `true` means staged. No run read, timeline or
  spend read says whether the request left or what it was answered: a wrong host, a private
  address, a credential that does not list the host, a credential removed since and a 4xx all
  look like success in the run. A private or loopback address is dropped before any request is
  made; written as a fixed `url`, the save warns `URL_SEND_ADDRESS_PRIVATE` naming the host. Confirm on the receiving system, with one live run, before
  relying on it.
- **With a `secret`, the address must be `https` on the default port**, or the step fails before
  anything is staged (`kipory-secrets` has the credential's own rules).

`url.fetch`, `url.fetch-as-file` and `url.send` share one budget, `outbound-request`: 60 requests a
minute **per project and per host**. Two projects never share it, and two hosts are two budgets. A
read in an `each` wider than that over one host is delayed, but only up to the function's wait
ceiling — a minute for `url.fetch`, a minute and a half for `url.fetch-as-file`; a call still
waiting then fails its step, so bound the `each` with `maxItems` or set `maxParallel`. A `url.send`
delivery over the budget is put back and sent later. The service's own limit is its 429, which a
read waits out once when the wait is short.

## Acting on the answer: a keyed attempt and a settle endpoint

`charge-member` records an attempt under a key, sends the charge once per key (the key goes to
the payment system as its idempotency key and as the reference it hands back), and stops.
`settle-charge`, behind its own endpoint, is what the payment system calls with that
key and its answer; it is the only place the answer is read.

```yaml
kipory: 11
types:
  ChargeAttempt:
    definition:
      type: object
      required: [attemptKey, memberId, outcome]
      properties:
        attemptKey: { type: string, maxLength: 120 }
        memberId: { type: string, maxLength: 64 }
        outcome: { type: string, enum: [pending, paid, declined] }
tables:
  chargeAttempt:
    ownerScope: project
    type: ChargeAttempt
    uses:
      fields:
        - source: { family: submission, field: attemptKey }
          uses: [key, filter]
flows:
  charge-member:
    label: Charge a member once for a renewal
    inputs:
      memberId: { typeName: string }
      renewsOn: { typeName: string }
      amount: { typeName: number }
    outputs:
      sent: { typeName: boolean }
    steps:
      - key: attempt
        function: record.create
        with:
          tableKey: chargeAttempt
          onKeyTaken: skip
          fields:
            attemptKey: { expr: "memberId & '@' & renewsOn" }
            memberId: memberId
            outcome: { literal: pending }
      - key: fresh
        if:
          - test: { not: { eq: [attempt.keyTaken, true] } }
            steps:
              - key: charge
                function: url.send
                with:
                  url: { literal: "https://payments.example.com/charges" }
                  method: POST
                  body:
                    expr: "{'reference': memberId & '@' & renewsOn, 'amount': amount}"
                  idempotencyKey: { expr: "memberId & '@' & renewsOn" }
            out: { sent: { literal: true } }
        else:
          steps: []
          out: { sent: { literal: false } }
      - key: done
        return: { sent: fresh.sent }
  settle-charge:
    label: Settle a charge from the payment system's answer
    inputs:
      attemptKey: { typeName: string }
      status: { typeName: string, description: "paid or declined" }
    outputs:
      outcome: { typeName: string }
    steps:
      - key: found
        function: record.list
        with:
          tableKey: chargeAttempt
          limit: 1
          pages: { max: 1, onMore: stop }
          fieldFilters: [{ field: attemptKey, op: eq, value: attemptKey }]
      - key: known
        if:
          - test: { not: { filled: found.records } }
            steps:
              - key: unknown
                fail:
                  {
                    code: NO_RESULT,
                    message: "No charge under that key.",
                    status: 404,
                  }
      - key: settle
        if:
          - test: { eq: [status, { literal: paid }] }
            steps:
              - key: markPaid
                function: record.update
                with:
                  {
                    recordId: "found.records[0].id",
                    fields: { outcome: { literal: paid } },
                  }
            out: { outcome: { literal: paid } }
        else:
          steps:
            - key: markDeclined
              function: record.update
              with:
                {
                  recordId: "found.records[0].id",
                  fields: { outcome: { literal: declined } },
                }
          out: { outcome: { literal: declined } }
      - key: done
        return: { outcome: settle.outcome }
surfaces:
  endpoints:
    settle-charge:
      contractConfig:
        method: POST
        path: /v1/club/charges/settle
        successStatus: 200
        auth: required
        params: {}
      targetConfig:
        kind: flow.invoke
        execution: sync
        flow: settle-charge
        inputs:
          attemptKey: { from: body }
          status: { from: body }
```

- **The key makes it once.** A second run for the same member and day finds the key taken
  (`keyTaken`) and sends nothing; the same key as `idempotencyKey` lets the payment system drop a
  retried request.
- **What depends on the answer goes in `settle-charge`**: renewing the member, a mail on a
  decline. A payment system calls with no person's session: its real endpoint is `auth: none`
  and checks the call with `request.verify-signature` as its first step (`kipory-expose`).
