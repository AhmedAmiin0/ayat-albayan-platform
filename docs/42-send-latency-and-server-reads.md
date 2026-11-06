# 42 — Send latency and repeated server reads

Owner 2026-11-06: «look at the time it took for the last message»; «make the chatting experience as smooth as
possible because it's slow». Design only. Read-only research on origin/develop de76c4ee, each finding checked
by a second agent. Ordered plan: docs/44. All PRs here are `apps/api` (one image for api + worker).

## 1. What we measured (production, read-only)

| Step of the last chat text | Time |
|---|---|
| queued → claim PATCH | 0.53 s (≈15 PostgREST reads in that window; part of them is the web reloading the inbox at the same time) |
| claim → sent PATCH (provider call to Kapso's Meta proxy) | 1.6 s |
| sent → delivered | +1 s |

| Line, last 7 days, attempts = 1 | p50 | p90 | n |
|---|---|---|---|
| chat text | 2.04 s | 2.61 s | 361 |
| chat template | 2.51 s | — | 7 |
| **notifications template** | **14.65 s** | **32.66 s** | 84 |

Trivial GET from the VPS: api.kapso.ai ~0.25 s, graph.facebook.com ~0.13 s. Kapso has no faster send API.

| Repeated reads, one quiet hour (API → PostgREST) | per hour |
|---|---|
| GET messages / settings / wa_numbers / students / subscriptions | 606 / 297 / 205 / 197 / 191 |
| integration_config + rpc integration_secrets_read | 178 + 178 |
| v_subscription_balance / profiles / message_templates / payments / thread_summaries / v_threads | 162 / 135 / 129 / 126 / 118 / 57 |
| In one send second | message_templates 10×, subscriptions 5×, v_subscription_balance 2×, v_threads 2× |

## 2. Root causes (confirmed)

| ID | Cause | Where |
|---|---|---|
| R1 | Jobs that queue notification rows (reminders, renewals, follow-ups, report-ready) never kick the sender: rows wait for the 30 s poll (avg ~15 s = the measured p50) | `queued-row.ts:33` («picks it up on its next tick»); `sender-timing.ts:2` `SENDER_POLL_MS = 30_000` |
| R2 | One drain sends one row at a time across all lines (`BATCH = 50`); `kick()` only queues one more pass. A chat text queued during an on-the-hour reminder burst waits for the burst | `common/jobs/ticker.ts:63-73`; `whatsapp/sender/message.sender.ts:18,128-139` |
| R3 | Per pass, before the first claim, reads run one after another: settings gate (`:72`), `holdAutomatic` when automatic is off (`:75`), app-send expiry + held rows (`window-release.ts:40-41`), `anyDue` (`:78`), templates **uncached** (`template-gate.repo.ts:14`), due rows (`:98`); then per row: gate again (`:130-131`), claim, provider, sent | `message.sender.ts`, `message.worker.ts:61-72` |
| R4 | `message_templates` ×10 per send: `reopenUsable()` on every thread list/detail load → `ReopenRequest.usable` → `registry.approved` → `templates.repo` `get()` (no cache) although `cached()` (60 s) + Redis `forget()` exist | `threads.service.ts:73-75`; `reopen-request.ts:50`; `template.registry.ts:45-46`; `templates.repo.ts:39-52` |
| R5 | subscriptions / balance / payments ×N per send: web `invalidateQueries(['threads'])` after every send re-reads list + chat; chat detail runs one balance chain per child (ponytail) | web `TextComposer.tsx:68`; `inbox/people/thread-people.ts:31` |
| R6 | integration_config + secrets RPC (and likely wa_numbers) reload on a 60 s timer in every process, although a save already reloads at once (`kickConfigReload` + Redis) | `integration-refresh.ts:6`; `integration-config.service.ts:48,87` |
| R7 | Idle worker ticks every 30 s read messages 3× (expiry, held, anyDue) ≈ 360 of the 606 GET messages/h | `app-send-expiry.ts:24`; `window.repo.ts:104`; `sender.due.ts:52` |
| R8 | Outbound fetch (Node undici) keeps idle sockets ~4 s: most chat sends after a pause open a new TCP + TLS connection to Kapso. No timing log around the provider call | `common/infra/http/http.ts`; `whatsapp.client.ts:18,46`; `message.worker.ts:67-71` |
| R9 | Enqueue re-reads the row twice after the upsert (by `dedup_key`, then by id); only needed on a replay | `thread-messages.repo.ts:67-73`; `outbox.ts:54` |
| R10 | The worker holds the kick request open until its pass ends (30 s timeout): during a long drain the API logs false kick failures | `jobs.controller.ts:41`; `worker-kick.ts:9,104` |

## 3. OFF switches (docs/09, docs/26 26-P4) — semantics kept

The gate is read uncached before every row (`whatsapp.settings.ts:11` «Never cached», `message.sender.ts:130-131`).
**Every plan below keeps that read, uncached, before every row.** Rejected: a Redis/TTL copy of the switch (a stale
ON after an OFF breaks 26-P4). Optional, owner sign-off only: check the gate inside the claim (one RPC that
claims only when `messaging_enabled`): atomic and one read cheaper, but it touches the safety path.
Parallel drain (42-7) changes one number: when OFF lands, up to N rows (N = concurrency) may already be past
their gate, against 1 today. Ship with N = 1, then 4 after owner OK.

## 4. Plan (small PRs)

| # | PR title | Files | Migration | Tests | Expected gain |
|---|---|---|---|---|---|
| 42-1 | fix(worker): kick the sender when jobs queue rows | module-level `wakeSender()` (like `onPaceDue`); reminders / alerts / follow-ups / report-ready repos. `follow-ups.job.ts` 150 and `reminders.job.ts` 149: call from the repos, not the jobs | none | unit: each queue path kicks once per batch | notifications p50 14.65 s → ~2–3 s (the 15 s poll wait goes) |
| 42-2 | chore(api): timing log for sends and outbound HTTP | `http.ts` `call()` logs `{evt:'http', where, status, ms}` (warn > 1 s; `where` has no host or query); worker logs `{evt:'wa_send', id, line, kind, queue_ms, provider_ms, record_ms, outcome}` — no phone, body or token | none | unit: fields, no secrets | measurement for every later PR |
| 42-3 | perf(api): cached templates for reopen note and sender | `reopen-request.ts` (100) / `template-gate.repo.ts` → `templates.cached()`; cleared by the existing `forget()` + Redis `templates` event on every write | none | unit: hit, invalidate on save | message_templates 129/h → ~15/h; −10 reads in a send second |
| 42-4 | perf(worker): pass reads in parallel | after the gate: `Promise.all([release, templates, due])`; skip `anyDue` on a kick. `message.sender.ts` is 149 and `sender/` has 12 files: new `sender/pass/` subfolder | none | unit: order, gate still first | chat −100…150 ms |
| 42-5 | perf(api): enqueue without re-reads | `thread-messages.repo.ts`, `outbox.ts` (68): read back only on a dedup replay | none | unit: replay path still returns the old row | −2 reads per send; kick lands earlier |
| 42-6 | perf(api): keep-alive to Kapso | pin `undici`; `setGlobalDispatcher(new Agent({ keepAliveTimeout: 20_000 }))` in `main.ts` (36); count `undici:client:connected` in the 42-2 log | none | unit: dispatcher options | −100…250 ms per send after an idle gap (TLS handshake) |
| 42-7 | perf(worker): per-line drain + chat ticker | new `sender/drain/`: lanes by the existing `pause` key run in parallel; notifications lane a pool of `MESSAGE_SENDER_CONCURRENCY` (default 1), rows of one phone stay in order; chat lane and Evolution numbers stay 1 at a time; an inbox kick drains the chat lane only | none | unit: per-phone order, pause defers the rest, claim CAS unchanged | chat text never waits behind a burst; burst time ÷N |
| 42-8 | perf(worker): kick answers 202 | `jobs.controller.ts` (52), `worker-kick.ts` (79): wait only with `?wait=1` (`Outbox.send` keeps waiting) | none | http test | no held sockets, no false warnings |
| 42-9 | chore(env): `INTEGRATION_REFRESH_MS=600000` | env only | none | — | integration_config and secrets RPC 178/h → ~18/h each |
| 42-10 | perf(worker): one idle probe | `sender.due.ts`: one RPC answers expiry / held / due | `20261106000810_sender_probe.sql` | migration + unit | GET messages −~240/h |
| 42-11 | perf(web): after a send refresh only the open chat | web `TextComposer.tsx` (149, at the cap: move the onSuccess into a hook file); batch balances per family (`balance.forStudents`) | none | composer + people tests | ~−15 reads per send |

Rules for builders: ≤150 lines per file, ≤3 params (options object), tests next to code. Baselines to keep or
shrink: api `message.sender.ts` `complexity 2, max-len 5`; web `TextComposer.tsx` `consistent-type-definitions 1,
complexity 1, max-len 12, max-lines-per-function 1, no-restricted-syntax 1`.

## 5. Rejected ideas

| Idea | Why not |
|---|---|
| Cache the OFF switches (Redis or in-process) | breaks docs/26 26-P4 «a value in any cache is never used» |
| Cache subscriptions / balances / payments | money data; batch per family instead (42-11) |
| A different Kapso send API (broadcasts, workflows) | asynchronous and slower; the Meta proxy returns the wamid synchronously |
| Parallel sends in the chat lane | breaks chat order and window holds; the pacing assumes one at a time |

## 6. Risks

| Risk | Guard |
|---|---|
| A newly approved template is not seen for ≤ 60 s without Redis | the reopen send keeps the uncached `get()`; a rejected template fails once at Meta and the existing failure path handles it |
| Keep-alive socket closed by the server as a POST starts | the send is recorded `uncertain`, never resent (existing path); keep the idle timeout below Kapso's |
| Parallel notifications hit Meta's per-recipient limit (131056) | rows of one phone never run at the same time |
