# Review C — «two WhatsApp lines»: web design, mobile design, stub + e2e + CI

Branch reviewed: `origin/feat/whatsapp-two-lines` (diff vs `origin/develop`, 137 files). Contract: docs/12 §13 (13.10 UI, 13.12 stub + e2e, 13.13 ops), docs/15, CLAUDE.md, docs/07.
Reviewer: independent cloud routine, 2026-10-11. No code was changed. No database, Supabase, e2e or Playwright run, and no `.env` file was read.

The skills `prototyping-testing:heuristic-evaluation`, `design-ops:design-qa-checklist` and `visual-critique:critique-brand-consistency` are not installed here. Lens 1 therefore applies Nielsen's 10 heuristics (Hn), a design-QA checklist and a docs/07 brand check by hand.

**What I ran (all green):**
- `pnpm i --frozen-lockfile` and `pnpm --filter @ab/db --filter @ab/shared build`
- web: `vitest run src/features/inbox src/features/messaging src/features/config`: 55 files, 286 tests
- mobile: `jest src/inbox/ThreadScreen.lines src/inbox/line-words src/inbox/ThreadScreen.privacy`: 3 suites, 14 tests
- `pnpm --filter wa-stub test`: 7 files, 45 tests
- `node --test tools/scripts/workflows.test.mjs`: 10/10

**How findings were proved:** with temporary unit tests that were deleted afterwards and are not committed. Each finding says whether it was proved this way.

**Counts:** blocker 0 · major 2 · minor 9.

---

## 1. Web design review

### Checked and correct
- **`LineBadge` is a quiet label:** a plain `<span class="text-2xs text-ink-3" data-testid="line-badge" data-line>` showing the enum word. It has no chip, glyph, tone or number, and no hooks or context. It renders `null` for a null or undefined line, so there is no badge on a single-line deployment. It sits after the lead_source span in `ThreadRow` (`ThreadRow.tsx:114`) and before `<time>` in the bubble footer (`MessageBubble.tsx:90`), as §13.10 asks.
- **`replyFromText` is pure.** It returns text only when `session_open && last_inbound_line`, and `{line}` is replaced with the enum word. `ReplyFromNote` uses `text-xs text-ink-3`. `WindowBanner`, `ThreadPane` and `window-state` are untouched.
- **RTL is respected:** only logical utilities are used (`ms-auto`, `text-start`, `gap-*`), with no `ml/mr/left/right`. Data shown inside Arabic text is isolated:
  - ids, the display phone number, raw Graph words (CONNECTED, GREEN…), app name/id and override URLs are in `<Ltr>` (`bdi dir=ltr`);
  - Meta's error message and the verified name are in `<bdi dir="auto">`.
  - The English Graph words are shown as data, not translated, as the contract says.
- **Tone discipline follows docs/07 §1–2:**
  - `lineTone` turns saffron (`act`) only for status DISCONNECTED / FLAGGED / RESTRICTED / UNVERIFIED / DELETED, quality RED, and name DECLINED / EXPIRED.
  - `code_verification_status` NOT_VERIFIED / EXPIRED is neutral-hollow. An unknown word is neutral-hollow and shown raw.
  - The webhook chip is saffron only for `none` and `other`, where messages are really being lost and the admin must act. `unverified` is neutral and `ours` is ok.
  - Green is used only for the button and `ok`. Gold is not used for anything clickable.
- **Accessibility at rest:** the card renders no `role=status` or `role=alert`. The only `role=status` is the error `Toast`, mounted only after a failure.
  - The button is disabled while pending and its label changes to «جارٍ الفحص…».
  - «لم يُفحص بعد» covers the never-checked state.
  - An unconfigured line shows only its name and a chip. Fields Meta did not return are left out, so there are no empty rows.
- **`webhookState` covers all four cases in §13.10:** unknown (row hidden), none, ours/other, and unverified. Each listed app shows its name · id; an override shows «عنوان استقبال بديل: <url>» with the URL isolated.
- **Settings integration:**
  - `showLines` takes part in both the early-return condition and the render gate.
  - The card sits after the switches and before the registry fields.
  - Nothing is fetched on mount. `checkLines` is a `POST` with no body.
- **`ServerGateNote`** adds `recipientsRestricted` as a plain ink-2 paragraph, only when `gate.restricted` is set. That is the right tone: it is information, not something the admin must do.
- **Copy:** all copy comes from `t.*` with no Arabic literals in tsx. It is clear Modern Standard Arabic (MSA), e.g. «سيصل ردّك عبر خط المحادثات». The `notSubscribed` and `webhookOtherApp` strings state the consequence plainly.
- **Rules:** every touched file is ≤ 150 lines; the largest is `SettingsSections.tsx` at 116.

### Findings

**W1 — major — the «replying from» note stays visible in template mode, where it is wrong (desktop and phone).** Proved.
`apps/web/src/features/inbox/Composer.tsx:52`
```tsx
<ReplyFromNote thread={thread} />
<SegmentedControl<Mode> … value={mode} …
```
`apps/web/src/features/inbox/ComposerPhone.tsx:56`
```ts
const notes = [open ? null : windowNote, gateNote, open ? windowNote : null, replyFromText(thread)]
```
- **Failure scenario:** a guardian writes to the chat number, so the window is open and `last_inbound_line = 'chat'`. The admin switches the composer to «قالب» and picks a template. The composer still says «سيصل ردّك عبر خط المحادثات». But §13.3 rule 1 routes every template through the notifications number, so the family receives it from the other number. The one sentence meant to remove line confusion tells the admin the wrong number at the moment they act (H1 visibility of system status, H2 match with the real world).
- **Proof:** a temporary test rendered `Composer` with `{session_open: true, last_inbound_line: 'chat'}` and clicked the «قالب» button. `getByText(replyFrom(chat))` still matched.
- **Smallest fix:** render the note only in text mode, i.e. `{mode === 'text' && <ReplyFromNote thread={thread} />}`. On the phone, use `mode === 'text' ? replyFromText(thread) : null` in `notes`. Optionally, show «خط الإشعارات» in template mode instead.
- **Note:** this follows the letter of §13.10, which does not mention the mode, so the contract line should be amended too.

**W2 — major — Meta errors (190 expired token, 10/200 permissions) are shown to the admin as raw English.** Proved.
`apps/web/src/features/messaging/LineRow.tsx:52-62`
```tsx
function CallErrors({ errors }: { errors: LineCheckView['errors'] }) {
  …
  <bdi dir="auto">{e.message}</bdi>
```
- **Failure scenario:** a Meta test token expires after about 24 h (§13.13 g). The card shows «تعذّر الاستعلام: Error validating access token: Session has expired on …» twice in red, and no facts or webhook row. A non-technical academy admin cannot tell from this that the token must be renewed, or by whom (H9 help users recognise, diagnose and recover).
  - `e.code` (190) is in the response but never used.
  - `t.messages.errors['190']` already exists in clear MSA: «انتهت صلاحية حساب واتساب — يجب تجديدها من Business Manager…».
- **Proof:** a temporary `LinesCard` test answered `errors: [{ step: 'phone', code: 190, message: 'Error validating access token: Session has expired' }, …]`. The English text rendered, and `queryByText(t.messages.errors['190'])` was `null`.
- **Smallest fix:** use `const known = e.code !== null ? t.messages.errors[String(e.code)] : undefined` and render `known ?? e.message`. Optionally keep Meta's text in a `title` attribute or a smaller `bdi`. No new i18n key is needed. The second clause of the 190 string («والرسائل تنتظر في الطابور») is about sending. It is still true here, but a later copy pass could add a diagnostics-specific variant.

**W3 — minor — a failed re-check wipes the last good result and says «لم يُفحص بعد».** Proved.
`apps/web/src/features/messaging/LinesCard.tsx:18-29`
```tsx
const check = useMutation({ mutationFn: checkLines, … });
const views = check.data;
{!views && <span …>{s.notChecked}</span>}
```
- **Failure scenario:** the admin checks successfully and sees CONNECTED/GREEN. They press «افحص الخطوط» again and the network fails. TanStack Query clears `data` when the mutation goes to pending, so the rows collapse while it runs. After the error the card says «لم يُفحص بعد» next to a «تعذّر فحص الخطوط» toast. That contradicts what the admin saw a moment ago, and the earlier «آخر فحص» time is lost (H1). The layout also jumps on every re-check.
- **Proof:** a temporary test with one success then one rejection: after the error, `CONNECTED` was gone and `notChecked` was visible.
- **Smallest fix:** keep the last successful answer, either `const [last, setLast] = useState<LineCheckView[]>()` set in `onSuccess`, or `useRef`, and render `views = check.data ?? last`.

**W4 — minor — the «not configured» chip does not tell the admin whether it is a problem.**
`apps/web/src/features/messaging/LineRow.tsx:85`
```tsx
<StatusChip size="sm" tone="neutral" glyph="hollow" label={s.notConfigured} />
```
- **Failure scenario:** on a single-line academy, «خط المحادثات · غير مضبوط على الخادم» is normal, because the chat line is optional (§13.1). The same neutral chip appears when the notifications line is unconfigured, which is mandatory: nothing sends. The admin cannot tell «fine, optional» from «broken» (H2, H9).
  - The intro describes the two lines' roles but never says the chat line is optional.
  - The notifications case is partly covered by `ServerGateNote`'s red «واتساب غير متصل بالخادم بعد», but that sits in another block.
- **Smallest fix:** for `line === 'notifications' && !configured`, use `tone="act" glyph="struck"`, since the admin must act. For chat, add one short MSA hint key (owner/contract decision), e.g. «اختياري: بدونه تُرسل كل الرسائل من خط الإشعارات». Not proved by test (reading of code + contract).

**W5 — minor — screen-reader users are not told when the check finishes.**
`apps/web/src/features/messaging/LinesCard.tsx:30-37`
- **Failure scenario:** with a screen reader, after activating «افحص الخطوط» the button label changes to «جارٍ الفحص…» and back. The results (configured chips, saffron «لن تصل الرسائل الواردة») appear silently below, and only a failure is announced (through the Toast). The card must not hold `role=status` at rest, because settings specs use strict `getByRole('status')`.
- **Smallest fix:** wrap the rows in a container with `aria-live="polite"` and `aria-busy={check.isPending}`, with no role, so the strict `getByRole('status')` lookups are unaffected. Alternatively, move focus to the first row heading on success. Not proved by test (reading).

**W6 — minor — the thread row's line label is invisible to screen readers.**
`apps/web/src/features/inbox/ThreadRow.tsx:72` (`aria-label={label}`) with `:114` (`<LineBadge …/>` inside the Link)
- **Failure scenario:** the Link's `aria-label` («افتح محادثة {name} — …») replaces all of its content as the accessible name. Sighted admins see «خط المحادثات» on the row; screen-reader users never hear it. The same is already true of lead source and kind, so this is not a regression of an existing pattern. It does mean the new information reaches only sighted users.
- **Smallest fix:** append the line word to `label` when `th.last_inbound_line` is set. Do not touch the existing name prefix: e2e looks it up with a substring match, so adding a suffix is safe. Not proved by test (reading).

**W7 — minor — at phone width, long override URLs and app names can push the page sideways.**
`apps/web/src/features/messaging/LineRow.tsx:37,41`
```tsx
<Ltr>{[app.name, app.id].filter(Boolean).join(' · ')}</Ltr>
<Ltr>{app.override_callback_uri}</Ltr>
```
- **Cause:** `Ltr` is `whitespace-nowrap` (`components/ui/ltr.tsx`), and neither the `<p>` nor the card has `overflow-wrap`, `break-all` or `overflow-x-auto`.
- **Failure scenario:** at 360 px the content box is about 328 px wide. A realistic override such as `https://api.staging.ayatalbayan.com/webhooks/whatsapp` (54 chars at 13 px ≈ 380 px) overflows the card. That breaks the «no horizontal page scroll at phone width» rule unless an ancestor clips it.
- **Smallest fix:** add `className="whitespace-normal break-all"` to those two `Ltr` uses. Not proved in a browser (Playwright was not run here); based on reading the CSS classes.

**W8 — minor — on phones the note is hidden behind the collapsed notices.**
`apps/web/src/features/inbox/ComposerPhone.tsx:37,56`
- **Failure scenario:** the notices button shows only the first note while collapsed (`max-h-[1.5em]`, `truncate`). With an open window and an open gate, the first note is «sessionUntil». The reply-from note is appended last, so on a phone the admin never sees it unless they expand the notices. The note is most useful while typing.
- **Smallest fix:** put `replyFromText(thread)` before the window note when the window is open. Or merge both into the first visible line, e.g. «… · سيصل ردّك عبر خط المحادثات». This follows the contract's «appends», so the order is the owner's call. Not proved by test (reading).

---

## 2. Mobile design review

### Checked and correct
- **OTA only.** The six mobile files changed are `Composer.tsx` (+2), `LineNote.tsx`, `MessageBubble.tsx` (+3/−1), `line-words.ts` and two tests. There are no `package.json`, `app.json` or native changes and no new imports outside `@/…` and `@ab/shared`.
- **Text and i18n:**
  - `Text` is never imported from react-native; both new renders use `AppText`.
  - There are no Arabic literals: strings come from `t.enums.waLine` and `t.inbox.line.replyFrom`. `lineWord` falls back to the raw value for an enum word this build does not know yet, so a newer API cannot crash the bubble.
- **Layout and touch:**
  - `LineNote` has no direction-specific styles. Its style matches `GateNote` (`type.ui[500]`, `size.xs`, `color.ink2`).
  - The bubble word is a plain `AppText` with the existing `small` style, not a `StatusChip`. It sits after the time in the meta row (`flexDirection: 'row'`, which follows the app's RTL setting).
  - No touchable was added, so no 44 pt target is affected.
- **No business number is ever rendered.** Only the line word appears, and `ThreadScreen.lines.test` runs the `SHOWN` privacy sweep for a teacher with a chat-stamped thread.
- **Old persisted cache:** `ThreadView.last_inbound_line` and `MessageView.line` are optional. `LineNote` reads `thread?.last_inbound_line` and the bubble checks `m.line ?`, so a cached thread from before the feature shows no word and no note. This is tested («an old cache renders as before»). `provisionalMessage()` (`thread-cache.ts`) does not set `line`, so an optimistic row correctly shows no word until the server row replaces it.
- **Scope coverage:**
  - Admin and teacher are covered by tests.
  - Sales uses the same admin `ThreadMode` (`{kind:'admin'}`), so it sees the same labels, as §13.10 asks («Sales and teachers see the same labels»).
  - `GateNote`, `ThreadScreen` and `ThreadsList` are untouched; `Composer.tsx` gains exactly one JSX line after `<GateNote />`.
- **Mobile is free of W1:** the note sits above the free-text input, and templates go through a separate modal sheet. So the note never sits next to a template send action.

### Findings
None.

---

## 3. Stub + e2e + CI

### Checked and correct
- **The stub stays single-line when no chat identity is configured.**
  - `server.ts` builds `chat` only when `WA_CHAT_PHONE_NUMBER_ID` is set.
  - `stubLines()` then returns only the notifications identity, with display `15550001111` and entry `stub-waba`, both pinned.
  - `acceptedTokens()` is empty when no token is set, so authorisation stays lenient.
  - The four legacy stub test files pass unchanged; all 45 tests are green.
- **Each line is its own identity:**
  - `postMessage` records `phoneNumberId` from the Graph path for every send and every read; `readLog` is cleared by both `DELETE /__stub/messages` and `/__stub/reset`.
  - `/__stub/inbound` signs with the line's own secret and uses its metadata and entry id. `signWith` overrides the secret for the bad-signature case.
  - An unknown id keeps the notifications identity with that id in the metadata, which is exactly what the API's `acceptsNumber` ignores with a 200.
  - Delivery statuses are signed with the secret of the line that sent the message.
- **The diagnostics routes match what the API calls.** `GET /v*/{pn}?fields=` is a branch of the existing media handler, and `GET /v*/{waba}/subscribed_apps` answers `[]` once a line is marked unsubscribed. `POST /__stub/lines/{pn}` changes a line's health and `/__stub/reset` restores it.
- **The signatures and ids match what the API verifies.**
  - `appSecrets(env)` accepts `e2e-app-secret` or `e2e-chat-secret`.
  - `lineNumbers(env)` = `{notifications: 'e2e-phone', chat: 'e2e-chat-phone'}`, the same ids the stub uses.
  - `lineFor` stamps only because `numbers.chat` is set, so in e2e every inbound is stamped, notifications included.
  - The chat sender uses `e2e-chat-token`, which `authorized()` accepts because it is in the token set. No 401, so no 190 auth hold.
- **`authorized()` leniency is safe for e2e and CI:**
  - Both tokens are configured, so a bearer outside the set gets 401, as before.
  - The path's phone id is deliberately not tied to its token (§13.12, YAGNI).
  - Control routes need no auth; media downloads still require a configured bearer.
  - See S1 for the one edge case.
- **`playwright.config.ts`:**
  - `E2E_WA_CHAT` is spread into both the stub env and the API env, and `WA_WABA_ID` is passed to the stub.
  - `WA_ALLOWED_RECIPIENTS: ''` (blank means unset, so no restriction) and `WA_TEMPLATE_SYNC: 'true'` are set explicitly in the API env. Node's `--env-file-if-exists` does not override variables that are already set, so `.env` cannot change them.
  - `MESSAGE_SENDER_POLL_MS: '1000'` is unchanged.
- **Spec-by-spec verdict, read as the runner would run them:**
  - `wa-two-lines.spec.ts`, all 4 cases pass:
    - `stubInboundOn` spreads the line's pn, then the spec, so the `phoneNumberId` override wins.
    - The webhook answer reaches the spec as `res.status` (200/401).
    - `v_threads` is queried directly.
    - `openThread` finds the row by link-name substring, and the log locator contains only bubbles: 2 badges, one per `data-line`.
    - Phones are unique (`freshDigits`), and `stubReset` runs in `beforeEach`.
    - Rows are ordered by `created_at` across separate webhook requests, so the order is deterministic.
  - `wa-two-lines.reply.spec.ts`, all 4 cases pass:
    - The textbox name `ar.inbox.composer.messageLabel` matches `TextComposer` `aria-label`, in both full and compact (phone) layouts.
    - Send is matched by `ar.inbox.composer.send`, `exact`.
    - `ThreadSendService.text` stamps `last_inbound_line`, and the sender claims with `line` because `dispatch.multi` is true.
    - The stub's window is keyed by digits and was opened by the inbound.
    - `booking_confirmation_plain` is approved in both the seed (migration 141) and the stub's defaults, with 2 params matching `{'1','2'}`. With `created_by` set the row is not automatic, has no lesson and no expiry, so `dropReason` is null.
    - Read receipts go through `lines.chat.markRead`, and the gate is open via `setMessaging(true)`. A 75 s wait against a 1 s tick is ample.
    - Nothing in the API queues an outbound row when an inbound arrives (only reminders, report-ready, outbox and alerts insert outbound), so the «0 on the chat number» assertions are stable.
  - `whatsapp-lines.sql.spec.ts` passes:
    - It is desktop-only via `test.skip(project.name !== 'desktop')`.
    - Each test runs in a rolled-back transaction, and every row gets a DISTINCT `created_at`.
    - `${null}::public.wa_line` is valid, and an outbound row with only `body` satisfies `check (template_key is not null or body is not null)`, with status defaulting to `queued`.
    - `OLD_COLUMNS` matches the migration-290 select list exactly, in order.
    - anon and authenticated get 42501 (revoke repeated); service_role reads.
- **The existing ~26 stub-using specs stay compatible:**
  - `stubInbound` defaults to the notifications line.
  - `StubSent` only gained an optional field. No spec deep-equals stub send objects; all of them filter by `to`, `template` or `type`.
  - Grepping `e2e/tests` + `e2e/support` for `toHaveText`/`textContent` on thread rows, bubbles, footers or articles finds none. The only `toHaveText` hits nearby are `window-banner`, `rating-chip` and `getByRole('status')`, all untouched.
  - `LineBadge` has no role, so strict `getByRole('status')` lookups are unaffected.
  - No e2e spec uses the settings search.
- **`workflows.test.mjs`:**
  - `FLAGS` now covers `MESSAGING_ENABLED | WA_PHONE_NUMBER_ID | WA_CHAT_PHONE_NUMBER_ID | WA_ALLOWED_RECIPIENTS` as whole words. `\bWA_PHONE_NUMBER_ID\b` does not match inside `WA_CHAT_PHONE_NUMBER_ID`, hence the separate entry, and a self-test proves it.
  - It checks job env keys, step env keys, `run` and `with`. The `vars.MESSAGING_ENABLED` `if` exception is kept for `deploy-staging.yml` only.
  - No `secrets.X` references were added; 10/10 pass.

### Findings

**S1 — minor — `authorized()`: a chat token alone makes the notifications line strict.** Proved.
`tools/wa-stub/src/lines.ts:56-69`
```ts
const tokens = [opts.accessToken, opts.chat?.accessToken];
…
return accepted.size === 0 || accepted.has(token);
```
- **Failure scenario:** a developer runs the stub with only the chat line's variables in their shell (`WA_CHAT_PHONE_NUMBER_ID` + `WA_CHAT_ACCESS_TOKEN`) and no `WA_ACCESS_TOKEN`. Before this change the notifications line was lenient. Now every notifications call with the API's own token gets 401 / error 190, so the local API puts all notifications rows in a 15-minute auth hold and pushes `whatsapp_auth`.
- **Impact:** e2e and CI are unaffected, because both tokens are set.
- **Proof:** a temporary test showed `authorized(Bearer local-token, { chat: { phoneNumberId: 'c', accessToken: 'chat-token' } })` → `false`, while `{}` → `true`.
- **Smallest fix:** stay lenient when the notifications token is unset, e.g. `if (!opts.accessToken) return true;` before the set check. Alternatively, document in `server.ts` that the chat token requires `WA_ACCESS_TOKEN`.

**S2 — minor — «افحص الخطوط» is never exercised end to end, and its e2e helper is unused.**
`e2e/support/wa-lines.ts:51` (`stubLineHealth`) has no caller in `e2e/tests`. No spec posts to `/messaging/lines/check` or opens the Lines card. `e2e/playwright.config.ts:23-28` sets no `WA_CHAT_APP_ID`.
- **Failure scenario:** a regression in `LinesController`, `LinesCheck`'s parsing of the real (stub) Graph shapes, the `access-before.json` permission, or the card wiring would pass CI. The stub's diagnostics routes are tested only against themselves.
- **Pitfall for whoever adds a spec:** as configured, the chat row would show «unverified» (neutral), not «subscribed». The API has no `WA_CHAT_APP_ID`, while the stub's chat app is `stub-chat-app`.
- **Smallest fix:**
  1. Add `WA_CHAT_APP_ID: 'e2e-chat-app'` to `E2E_WA_CHAT`, so it reaches both servers through the existing spreads.
  2. Add one desktop spec of about 40 lines: the admin opens /admin/settings and clicks «افحص الخطوط». Two `line-row`s show «مضبوط» and «التطبيق مربوط بالحساب». Then `stubLineHealth(CHAT_PN, { subscribed: false })` and check again: the chat row shows `notSubscribed` with `data-tone="act"`.
- Not a contract violation: §13.12 does not list such a spec. Not proved (absence verified by grep).

**S3 — minor — the CI flag guard does not inspect workflow-level `env:`** (a gap that existed before; it now also covers the two new keys).
`tools/scripts/workflows.test.mjs:43`
```js
const steps = jobsOf(w).flatMap(([, j]) => [{ env: j.env }, ...(j.steps ?? [])]);
```
- **Failure scenario:** `deploy-staging.yml` gains a top-level `env: { WA_ALLOWED_RECIPIENTS: … }` or `MESSAGING_ENABLED: 'true'`. The test stays green, although §13.13 says these are set by hand on the server only. Workflow-level `env:` blocks already exist (`ci.yml:19`, `mobile.yml:32`), so the shape is realistic.
- **Smallest fix:** prepend `{ env: w.doc.env }` to `steps` (one line), and optionally also test `FLAGS` against `JSON.stringify(s.env)` so `${{ vars.WA_ALLOWED_RECIPIENTS }}`-style values are caught.
- Not proved by a test run (reading; the steps list is built from jobs only).

---

## Summary

| lens | blocker | major | minor |
|---|---|---|---|
| web design | 0 | 2 (W1, W2) | 6 (W3–W8) |
| mobile design | 0 | 0 | 0 |
| stub + e2e + CI | 0 | 0 | 3 (S1–S3) |

Top items:
- **W1:** the «سيصل ردّك عبر خط المحادثات» note stays visible in template mode, but templates always leave from the notifications number.
- **W2:** a Meta 190 is shown to the admin as raw English, even though `messages.errors['190']` already has clear MSA.
- **W3:** a failed re-check wipes the previous result.

Reading the e2e specs as the runner would, all three new specs should pass, and the existing specs stay compatible with two-line mode.
