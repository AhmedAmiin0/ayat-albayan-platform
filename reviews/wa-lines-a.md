# Adversarial review A: two WhatsApp lines (safety, single-line regression, sender routing)

Branch reviewed: `origin/feat/whatsapp-two-lines` (diff vs `origin/develop`, 137 files). Contract: docs/12 §13, docs/15.
Method: I read every changed production file in `apps/api/src/{env*,modules/whatsapp,modules/webhook,modules/inbox}`, the migration, web/mobile line UI, e2e config and every modified `*.test.ts`. I grepped every Meta call site, then ran throwaway vitest probes (deleted, not committed). Baseline: `vitest run src/modules/whatsapp src/modules/webhook src/modules/inbox src/env` gives 71 files and 607 tests, all passing.

**Result: 0 blocker, 0 major, 4 minor.** I found no way to get a byte to Meta for a recipient outside `WA_ALLOWED_RECIPIENTS`. I found no single-line regression beyond the four deltas the contract already declares.

---

## Lens 1: allow-list bypass

### Checked and correct
- **Every Meta call site** (grep of `.sendTemplate( .sendText( .sendDocument( .markRead( .getMedia( .getTemplates( .submitTemplate( .uploadSample( graphFetch( graphJson( fetch(` over `apps/api/src`, excluding tests):
  - **Sends:** only `MessageDispatch.send` sends a message to a person (`message.dispatch.ts:53,62`).
  - **Read receipts:** `markRead` is called only from `ReadReceipts`.
  - **Media:** `getMedia` is called only from `InboundMedia.download`.
  - **Templates:** `getTemplates`, `submitTemplate` and `uploadSample` are called only from `TemplateRegistry`.
  - **Line check:** `lines.check.ts` makes two read-only GETs with no recipient.
  - **Other `fetch(` calls** (livekit, fx, Expo push, storage) do not go to a Meta base.
  - **Producers:** jobs, feedback, classroom join links, report-pdf, booking RPCs, alerts, follow-ups, lesson-rating and the inbox send-now path all INSERT `messages` rows and at most `sender.kick()`. Nothing else calls a client. There is no `pg_net`/`http_post` in migrations, and `new HttpWhatsappClient(` appears only in `whatsapp.module.ts:28-29`, both times with `{ allowed }`.
- **(a) SQL layer:** `due()` and `holdAutomatic()` both apply `.in('phone_e164', [...allowed])` when the list is set (`sender.queries.ts:43,63`).
  - **List format:** list items are normalised to `+digits` and `phone_e164` is stored E.164, so the match is exact.
  - **The `+` sign:** supabase-js percent-encodes `+` via `URLSearchParams`, so it is not decoded as a space.
  - **Paths that end in `due()`:** retry (`requeue` → queued), immediate send after enqueue (`Outbox.send` → `kick` → `due`), and rows already `sending` all go through `due()`. Rows to other phones are never read, so they are never claimed or failed.
  - **Paths that never reach Meta:** hand-off and sent-manually never call Meta.
- **(b) `MessageDispatch.ready`** checks `recipientAllowed` before the claim (`message.worker.ts:101`).
- **(c) `ReadReceipts.open`** returns before any `markRead` for a phone off the list, and `read_at` is still stamped.
- **(d) `HttpWhatsappClient.send`** throws `WaError(131030, status 0)` before the request for `sendTemplate`/`sendText`/`sendDocument`. The guard reads `this.allowed`, which both clients receive.
  - **What a 131030 leads to:** it is not retryable and not an auth code, so the row is failed with one `reminder_failed` push for that row and try. There is no retry loop and no repeated push.
  - **Admin retry:** a retried row goes back to `queued` and is then invisible to `due()`, so it never reaches the client.
- **Env parsing (proved by probe):**
  - **Blank values:** a blank or whitespace-only value means unrestricted, which is the documented behaviour.
  - **Values that fail the boot:** `,`, a quoted value `"+2010…"` and any non-E.164 item all fail the boot (fail closed).
  - **Formatting:** `201001234567, +20 100-123-4567,` normalises to `['+201001234567']`, and `recipientAllowed` strips non-digits from `to`.
- **`WA_TEMPLATE_SYNC`:**
  - **Accepted values:** `FALSE` and `0` parse to `false` (probe), and the default is `true`.
  - **What it stops:** `verifyAll`, `submit` and the boot check are its only Meta-touching callers, and all three are gated.
  - **No other sync path:** nothing in the webhook handles template-status changes.
- **`getMedia` and `lines.check`:** neither carries a recipient. `getMedia` fetches a media id with the receiving line's token, and the contract does not require an allow-list there.

### Findings

**A1 (minor): `meta-callers.guard.test.ts` can be fooled in at least six ways.** Proved by probe: `offenders()` returned `[]` for all six inputs below.
- **Where:** `apps/api/src/modules/whatsapp/meta-callers.guard.test.ts:38` and `:19`.
  ```ts
  .filter((f) => !WHITELIST.has(basename(f.path)) && ...)
  const META_CALLS = ['.sendTemplate(', '.sendText(', ..., 'graph.facebook.com', 'graphFetch(', 'graphJson('];
  ```
- **Inputs it missed:**
  1. The whitelist matches the **basename** only, so `modules/leads/message.dispatch.ts` calling `this.client.sendText(...)` passes.
  2. `client['sendText'](…)`
  3. `client.sendText (…)` (a space before the parenthesis)
  4. `const { sendText } = lines.chat; sendText.call(…)`
  5. A raw `fetch(\`${env.WA_API_BASE}/…/messages\`)`. The real base comes from env, so the `graph.facebook.com` literal never appears.
  6. `.submitTemplate(` / `.uploadSample(` / `.getTemplates(`, which are not in the list.
- **Impact today:** none. The runtime layers (a), (b) and (d) still hold. But the test is the contract's stated safeguard against a future bypass, and the bypass it is meant to catch would most likely be a new module calling a client or `fetch` directly.
- **Smallest fix:**
  - Whitelist by relative path (`modules/whatsapp/message.dispatch.ts`, …).
  - Match with regexes: `/\.\s*(sendTemplate|sendText|sendDocument|markRead|getMedia|getTemplates|submitTemplate|uploadSample)\b/`, `/\[['"](send\w+|markRead|getMedia)['"]\]/`, and `/\bWA_API_BASE\b/` or `\bgraph(Fetch|Json)\b` outside the whitelist.
  - Also fail when `WHATSAPP_CLIENT` / `WHATSAPP_LINES` / `HttpWhatsappClient` is injected or constructed outside the whitelist. This is the most robust check, because a call is impossible without the client.

---

## Lens 2: single-line regression (`WA_CHAT_*` unset)

### Checked and correct
- **Inserts and updates:**
  - **Inbound insert:** `lineFor` returns null when `numbers.chat` is unset, and `inboundRow` then carries no `line` key (`webhook.inbound.ts`).
  - **Claim:** `claim` spreads `line` only when `dispatch.multi`, which is false when chat is unset, so the update is identical to develop.
  - **Inbox text:** `ThreadSendService.text` adds `line` only when `last_inbound_line` is non-null, which is always null on a fresh single-line DB.
  - **Producers:** no other producer writes `line`.
- **Selects that read `messages.line`:** `DUE_COLUMNS`, `InboundMediaQueries.COLUMNS`, `markInboundRead`, and `v_threads.last_inbound_line` (thread list and thread). These are declared (delta 2), and `deploy-staging.yml` runs `migrate` before `deploy` by default. See **B1** for the failure mode when it doesn't.
- **DI:**
  - **Client token:** `WHATSAPP_CLIENT` is `lines.notifications`, so `TemplateRegistry` sees the same instance as before.
  - **Constructor changes:** `MessageDispatch`, `ReadReceipts` and `InboundMedia` now take `WHATSAPP_LINES`, which is exported from the global module.
  - **Send gate:** `sendingAllowed` is unchanged.
- **Webhook:**
  - **Number filter:** `acceptsNumber({notifications: X}, id)` behaves exactly like develop's `if (phoneNumberId && number && number !== phoneNumberId) return`. With `WA_PHONE_NUMBER_ID` unset, `numbers = {}` and everything is accepted, as on develop.
  - **Secret check:** with an empty or absent secret, `appSecrets` is `[]` and `verifySignature` returns false (401), as on develop. Blank values were already unset via `optionalSecret`.
  - **New log line:** the one added warning per unknown id is delta 4.
- **Read receipts:**
  - **Configured line:** with chat unset and notifications configured, behaviour equals develop.
  - **Unconfigured client:** develop would throw-and-log, the branch skips silently. Both send nothing.
  - **`newestPerLine` difference:** it skips rows with a null wamid instead of returning null when the newest row has none. This is benign, since inbound rows always have a wamid.
- **Auth hold and pause:** with one line every row is `notifications`, so `paused.add(line)` followed by `continue` is equivalent to the old `break`. The alert subject for notifications is unchanged (`whatsapp_auth:<day>`).
- **Contract deltas:**
  - **`GateView`:** `restricted` is spread only when the list is set, otherwise the shape is exact.
  - **Template sync:** defaults to on.
  - **Media 410→502:** applies to auth codes only and is declared (delta 3).
- **Web and mobile with null line:**
  - **Web:** `LineBadge` returns null and `replyFromText` returns null.
  - **Mobile:** `LineNote` returns null, and `MessageBubble` renders the word only when `m.line` is truthy.
  - **Unknown enum value:** mobile shows the raw value; web renders nothing.
- **Modified tests** (`git diff --diff-filter=M`): no assertion was weakened.
  - **Signature changes only:** `appSecret: undefined`→`appSecrets: []`, `secret`→`secrets:[secret]`, and the extra `line` argument in `send(...)` and `toHaveBeenCalledWith`. Each has an equivalent or stricter assertion.
  - **New assertions:** `chatClient.markRead` not called.
  - **Inbox test-app default:** it now has `configured: true`. That is needed because `ReadReceipts` checks `configured()`, and the existing `markRead` call assertions are kept.
  - **Renamed `inbound-media` test:** it still asserts 404 → 410.
  - **Worker tests:** they set `multi: false`, so they still pin the single-line claim payload.

### Findings

**B1 (minor): an API shipped before migration 290 stops ALL outbound sending, and the only signal is a log line.** Reasoned, not run, because there is no DB in this run.
- **Where:** `apps/api/src/modules/whatsapp/sender.due.ts:29-30`.
  ```ts
  'id, phone_e164, ..., error_code, line, lesson:lessons(...)'
  ```
- **What happens:**
  - **Sender:** if `deploy-staging` is run with `migrate` unticked, or the production deploy and DB migration are done out of order, `due()` fails with `column messages.line does not exist`. `MessageSender.runOnce` catches it and logs `send pass aborted` every 30 s. Reminders, reports and booking confirmations all stay queued, and no admin push is sent.
  - **Inbox:** the thread list, `markInboundRead` and media also return 500.
- **Is it documented?** Yes, in the migration header and §13.15, but nothing enforces it by machine.
- **Smallest fix:** add one boot-time probe, `select('line').limit(0)` on `messages`. On failure, log at error level and fail the readiness check, or `notifyAdmins` once. Alternatively, have the deploy preflight assert that `20261010000290` is applied before `deploy`.

**B2 (minor): `e2e/playwright.config.ts` now runs every existing e2e spec in two-line mode, so production's actual configuration (single line, no `WA_CHAT_*`) has no e2e coverage.**
- **Where:** `e2e/playwright.config.ts:23-28,71,87`. The config spreads `...E2E_WA_CHAT` into both the stub and API env.
- **Failure scenario:** a later change writes `line` unconditionally, or routes a template or receipt through `lines.chat` when chat is unset. All 111 specs still pass, because chat is always configured in e2e. The single-line deltas are only pinned by unit tests with mocked clients (`multi: false`).
- **Smallest fix:** keep the two-line config for `wa-two-lines*.spec.ts` only, either as a separate Playwright project or a second `webServer` on another port. Leave the existing journeys on the single-line env.
- **Lighter alternative:** one CI job that runs the six §5 journeys with `WA_CHAT_*` unset.

---

## Lens 3: sender routing

### Checked and correct
- **`lineOf`:** a template row always goes to `notifications`, and a text row goes to `row.line ?? 'notifications'`. `MessageDispatch.send` calls `lines.notifications.sendTemplate` literally, so a template composed from a chat thread still leaves from notifications (`thread-send.template()` writes no line).
- **Worker order:** the order is lineOf → drop → SENDING (UNRECORDED, uses line for the alert subject) → auto_off → readyToSend → `ready` → claim → send. If `ready` is false the row is not touched at all (probe: 0 claim, 0 failure, 0 expire calls).
- **Per-line pause:**
  - **Skipped rows:** a paused line's rows are skipped before the gate reads and are not counted.
  - **Other line:** a paused chat line does not block notifications rows in the same pass, and the reverse.
  - **Auth-held row:** it gets `next_attempt_at = now + 15 min` and drops out of `due()`.
  - **Alerts:** subjects are per line and per day.
- **Inbox text:**
  - **Check order:** the 409 `session_closed` check runs before the 503 `line_not_configured` check, which runs before the enqueue (`thread-send.service.ts:78-80`).
  - **Window equals the replying line's window:** the merged `last_inbound_at` is the timestamp of the newest inbound, and `last_inbound_line` is that same row's line. `array_agg … order by created_at desc, id desc` keeps NULLs, so a newest row with no line yields null and never an older row's line.
  - **Policy, not a bug:** a reply hops to the other line if the customer's newest message came there.
- **Races:**
  - **Line stamp vs claim:** the line is stamped in the same INSERT as the row, so the claim can never see an unstamped text.
  - **Concurrent claims:** the claim stays compare-and-set on `(id, status=queued, attempts)`.
  - **Request-id replay:** a replayed request id returns the first row with its original line.
  - **Late inbound:** a new inbound on the other line after enqueue does not reroute an already-queued row. Its line's window was open at enqueue, which is the same exposure as develop's queue delay.
- **Outbound reply context:** no outbound producer sets `reply_to_wa_id`, the only writer being the webhook for inbound. So there is no cross-line `context.message_id` problem.
- **Lesson rating and quick replies:** the templates leave from notifications. Button and typed replies on either line are matched by phone (line-agnostic) and are unchanged.

### Findings

**C1 (minor): rows that can never be sent are not filtered in SQL, so they can fill the 50-row batch and starve every other row, including notifications templates.** Proved in part: the probe shows a chat-stamped text with chat unconfigured returns `skipped` forever with zero DB writes. The ordering and limit are read from the code.
- **Where:**
  - `apps/api/src/modules/whatsapp/message.worker.ts:101`: `if (!this.dispatch.ready(row, line)) return null;`
  - `sender.queries.ts:44`: `.order('scheduled_for', { ascending: true, nullsFirst: true }).limit(input.limit)`
  - `message.sender.ts:82`: `if (paused.has(line)) continue;`
- **Why these rows sort first:** inbox texts have `scheduled_for = null`, so they sort FIRST in `due()`.
- **Scenario 1, chat unconfigured (permanent):**
  - **How rows pile up:** chat is configured and texts are queued, for example while the admin switch is off. Or failed chat texts are retried after rollback, since `requeue` keeps `line`.
  - **What triggers it:** the chat env is removed (the rollback in §13.15) or broken (`lineEnvs.chat` becomes null).
  - **Result:** every pass reads the same ≥50 chat rows, skips all of them, and never reaches reminders, reports or booking confirmations. The admin sees them `queued` with the gate reported `open`.
- **Scenario 2, dead chat token (time-limited):**
  - **The cycle:** each pass auth-holds only ONE chat row for 15 min and `continue`s past the rest. At the 30 s tick, at most about 30 chat rows are ever held at once.
  - **When it starves:** with about 80 or more queued chat texts, the batch stays full of chat rows and notifications are starved until the token is fixed.
  - **Contract claim this breaks:** §13.3.4 says "a dead chat token never delays notifications rows".
- **Likelihood:** both scenarios need an unusual backlog of chat texts.
- **Smallest fix:**
  - **Part 1:** mirror the allow-list's reasoning (§13.5a). In `due()`, when the chat client is not configured, add `.or('template_key.not.is.null,line.is.null,line.neq.chat')`. `SenderQueries` would get a `chatConfigured` flag or input field.
  - **Part 2:** in `runOnce`, once a line is paused, mark the rest of that line's rows in the batch with the same 15-min hold (or exclude that line in a re-query) so they leave the batch.
  - **Simpler alternative:** fail chat-stamped texts as `line_not_configured` (failed, with the admin notified) instead of leaving them queued untouched.

---

## Summary

| id | severity | where | proved |
|---|---|---|---|
| A1 | minor | `meta-callers.guard.test.ts:19,38` (basename whitelist, string needles) | yes (probe, 6 bypass inputs) |
| B1 | minor | `sender.due.ts:29-30` (API before migration silently stops all sends) | reasoned |
| B2 | minor | `e2e/playwright.config.ts:23-28,71,87` (no single-line e2e) | reasoned |
| C1 | minor | `message.worker.ts:101`, `sender.queries.ts:44`, `message.sender.ts:82` (unsendable chat rows starve the batch) | partly (probe: row stays untouched forever) |

No blocker or major found. All four allow-list layers hold on every path enumerated above, and with `WA_CHAT_*` unset behaviour equals develop apart from the four declared deltas.
