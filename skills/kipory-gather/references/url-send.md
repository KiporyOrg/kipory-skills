# Telling an outside system something

Read this before a flow writes to an outside system with `url.send`.

## Telling an outside system something: `url.send`

`url.send` is not a read. It sends a POST, PUT, PATCH or DELETE to an outside system; never reach
for `url.fetch` to do that, because a read is cached and may be sent several times.

- **Staged once per run, delivered after the run has saved everything else.** A run that fails
  sends nothing, and the flow never sees the answer.
- **The receiver may see a request twice.** A transient failure — no answer, a 5xx, a 429 — is
  retried for about ten minutes, every attempt with the same `Idempotency-Key` header. A 3xx or
  4xx is final: a redirect is not followed. A new run of the same input stages a new request;
  name an `idempotencyKey` so the receiving system can recognise that repeat too.
  <!-- field-ok: idempotencyKey — a `url.send` config field, listed on the function's reference page -->
- **In a preview or an eval run the action checks and does not send.** It answers `true` with a
  `PREVIEWED_NOT_SENT` warning naming the method and host, and the rest of the flow runs. A secret
  that is not stored fails it as `api-key-missing`, and an address outside the secret's hosts fails
  it as the delivery would. Prove the delivery with one live run.
- **Nothing reports the delivery.** The action's `true` means staged. No run read, timeline or
  spend read says whether the request left or what it was answered: a wrong host, a private
  address, a credential that does not list the host, a credential removed since and a 4xx all
  look like success in the run. Confirm on the receiving system, with one live run, before
  relying on it.
- **With a `secret`, the address must be `https` on the default port**, or the action fails before
  anything is staged (`kipory-secrets` has the credential's own rules).

`url.fetch`, `url.fetch-as-file` and `url.send` share one budget, `outbound-request`: 60 requests a
minute **per project and per host**. Two projects never share it, and two hosts are two budgets. A
read in a fan-out wider than that over one host is delayed, but only up to the function's wait
ceiling — a minute for `url.fetch`, a minute and a half for `url.fetch-as-file`; a call still
waiting then fails its action, so bound the fan-out or set `maxParallelBranches`. A `url.send`
delivery over the budget is put back and sent later. The service's own limit is its 429, which a
read waits out once when the wait is short.
