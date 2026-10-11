# Review B — two WhatsApp lines (webhook + read side, client + diagnostics + registry, DB + shared + i18n + docs)

Branch reviewed: `origin/feat/whatsapp-two-lines` (diff vs `origin/develop`). Contract: docs/12 §13, docs/15. Adversarial review only; no code was changed. Probes were throwaway unit tests (deleted); no DB, docker, network or secrets used.

**Totals:** blocker 0 · major 1 · minor 5 (lens 1: 0 · lens 2: 2 minor · lens 3: 1 major + 3 minor).

Top finding: docs/09 «Meta test credentials on staging» (a)/(b) let the owner switch to TEST credentials and restart before `WA_TEMPLATE_SYNC=false` is on the server; the boot template sync (`template.registry.ts:43-44`, not gated by `MESSAGING_ENABLED`) then marks every approved template `missing`.

## Lens 1 — webhook and read side

Scope: `apps/api/src/modules/webhook/**`, `inbox/{read-receipts,read-marks,threads.queries,threads.mapper}.ts`, `whatsapp/{inbound-media.service,inbound-media.queries,message.mapper}.ts`, `env.whatsapp.ts` (lineNumbers / appSecrets / lineEnvs), migration `20261010000290_wa_lines.sql`, checked against docs/12 §13 and how the Meta Cloud API behaves.
Tests run: 25 test files / 223 tests in these areas all pass. A throwaway probe test (4 cases, all passed) was written and then deleted. `git status` is clean.

### Checked and correct

- **Signature (`webhook.signature.ts:31-36`)**
  - The HMAC-SHA256 is computed over `req.rawBody`, the exact bytes Meta sent.
  - The expected value is `sha256=<hex>`. The header is trimmed and lower-cased before the compare.
  - `safeEqual` returns false when the lengths differ, so `timingSafeEqual` never throws.
  - Blank or undefined secrets are filtered out. With an empty list, no raw body or no header, it returns false and the controller answers 401 (fail closed).
  - `appSecrets(env)` drops duplicate and blank values. A body signed with either app secret is accepted; a third secret gets 401 (http test `webhook.http.lines.test.ts:31`).
- **GET handshake.** There is one `WA_VERIFY_TOKEN`, compared with `safeEqual`. If it is unset the answer is 403. This matches §13.6: the same token is typed into both Meta apps.
- **Routing by `value.metadata.phone_number_id`**
  - `entry.id` (the WABA id) is never used, which is correct because a phone-number id is unique.
  - `field()` turns a numeric id into a string.
  - `acceptsNumber` follows the contract exactly: it accepts when no number is configured, when the id is missing, or when the id is a configured number.
  - A change from an unknown id is dropped for both messages and statuses, the request still gets 200, and `onIgnored` fires. `WebhookService.ignored` is a per-process `Set` on a singleton, so the warning appears once per distinct id, not once per request. Proved by the probe and by `webhook.service.test.ts:76`.
- **`lineFor` (`webhook.lines.ts:13-17`)**
  - It returns null whenever `numbers.chat` is unset. With chat unset, `inboundRow` therefore spreads no `line` key, so the insert is identical to develop's (`webhook.http.lines.test.ts:64`).
  - With chat set it returns `'chat'` or `'notifications'`.
- **Partial chat config.** `lineNumbers` reads `WA_CHAT_PHONE_NUMBER_ID` alone.
  - The probe showed `{notifications:'n', chat:'c'}` while `lineEnvs(env).chat === null`. Chat messages are therefore received and stamped `'chat'` (http test line 71).
  - When the chat id equals `WA_PHONE_NUMBER_ID`, both `lineNumbers` and `lineEnvs` drop the chat line (probe).
- **Statuses from either line** are accepted when the id is configured (probe: a status carrying the chat id is kept, one from an unknown id is reported as ignored). `StatusService` matches only on the wamid, as §13.6 says.
- **wamid idempotency across lines.** `WebhookQueries` upserts with `onConflict: 'wa_message_id', ignoreDuplicates: true`. The same wamid arriving on both lines is stored once and pushed once (http test line 55). `upsert` of a single object sends no `columns=` parameter, so whether the `line` key is present does not matter.
- **`markRead`**
  - `ReadReceipts.open` stamps `read_at` first, returns when there are no marks, then checks the gate, then the allow-list (`recipientAllowed` normalises `+`).
  - It then sends one `lines[mark.line].markRead` per line, each in its own try/catch, and silently skips an unconfigured client.
  - `HttpWhatsappClient.markRead` posts to `{that line's phoneNumberId}/messages` with that line's bearer token. The probe confirmed `stub-chat-phone/messages` with `Bearer chat-token`.
- **`newestPerLine`.** A null line is merged into notifications and a null wamid is skipped.
  - The comparison is lexicographic on the `created_at` strings that PostgREST returns. This is correct even when the fractional digits differ (`…:00+00:00` < `…:00.123+00:00` < `…:00.5+00:00`, checked).
  - With chat unset it produces exactly one notifications mark for the newest row, the same as develop.
- **Media**
  - `MediaMessage.line` is selected in `COLUMNS`, which covers both `message()` and `recent()`. Both `cache()` callers (`thread-media.service`, `booking.invoice`) take the row from `InboundMedia.load`, so it carries `line`.
  - The download uses `lines[msg.line ?? 'notifications']`. The probe showed that the chat client sends its own bearer on both the metadata GET and the absolute lookaside download URL.
  - A `'chat'` row whose chat client is unconfigured gets 503 before any request. Codes 190/10/200 give 502 `meta_error` with `meta_code`, even with chat unset. Other 4xx (100/400, 100/404) give 410. A non-WaError is rethrown. Probe-verified.
- **`v_threads.last_inbound_line`**
  - The 20 existing columns keep their names, types and order (they are listed explicitly instead of `m.*`), and the new column is appended last.
  - `(array_agg(line order by created_at desc, id desc))[1]` keeps NULLs, so a newest row with no line yields null rather than an older row's line. This is what makes rollback 1b fall back to notifications.
  - Its ordering matches `max(created_at)`. The grants are repeated, and the rollback block matches migration 142 verbatim.
- **Mappers.** `toThreadView` adds `last_inbound_line: row.last_inbound_line` and `toMessageView` adds `line: row.line`. Every query that feeds them selects `*` (`MESSAGE_SELECT`, `select('*')`), so the key is always present. `forTeacher` and `forSales` spread the view, so every role sees the same label.

### Findings

None at blocker, major or minor severity. I found no wrong behaviour or contract deviation in this lens.

Notes, not defects:

- **(a) Chat id set without the notifications id.** If only `WA_CHAT_PHONE_NUMBER_ID` is set and `WA_PHONE_NUMBER_ID` is unset, `acceptsNumber` keeps only the chat id and ignores changes from any other number. Develop, with `WA_PHONE_NUMBER_ID` unset, accepted every number. This follows the §13.6 definition literally, and in that setup the notifications line cannot send anyway, so I am not reporting it.
- **(b) Possible extra cost in `v_threads`.** `array_agg(... order by ...)` sorts and builds an array of every inbound row per phone each time the view is read, whereas the existing `max`/`count` aggregates do not need a sort. At academy volumes this is negligible. A `distinct on (phone_e164)` CTE would avoid it if the volume grows. I did not measure this (no DB). Proved: no.
- **(c) Chat token falling back to `WA_ACCESS_TOKEN`.** If the chat line sits in another business, the notifications token usually cannot read chat media. Meta then typically answers code 100, which shows as 410 `media_expired`, not 502. This is the contract's own design (§13.1 fallback, §13.4 mapping), not a deviation. `chatGaps` will not warn, because the fallback counts as present.

## Lens 2 — client, diagnostics, registry

### Checked and correct

- **Per-line client isolation** (`whatsapp.client.ts`): every method resolves `this.connection()` and uses `c.env.*` of ITS line: `send` → `${c.env.phoneNumberId}/messages` (l.134), `markRead` same (l.68), `getTemplates`/`submitTemplate` → `c.env.wabaId` (l.78, l.97), `uploadSample` → `c.env.appId` and `OAuth ${c.env.accessToken}` (l.112-116), `getMedia` → both hops via `graphFetch(c, …)` so the bearer of the receiving line is used for the metadata GET and the binary download (l.124-125). `graph.ts` sets `authorization: Bearer ${conn.env.accessToken}` per conn. No shared state between the two instances.
- **Chat env** (`env.whatsapp.ts` `chatEnv`): own phone id/WABA, token falls back to `WA_ACCESS_TOKEN`, shared base/version, NO `appId` → chat `canUploadSamples()` false (verified at runtime in a probe). Null when the chat phone id equals `WA_PHONE_NUMBER_ID`. `lineNumbers` uses the phone id alone. `appSecrets` distinct, non-blank.
- **Allow-list in client** (`send`, l.132): checked after `connection()` and BEFORE `build()`/any request; throws `WaError('recipient not allowed', {code:131030,status:0})`. `opts.allowed ?? null` keeps `[]` as `[]` (→ deny all).
- **Nest DI** (`whatsapp.module.ts`): `WHATSAPP_LINES` provided by factory and exported; `WHATSAPP_CLIENT` = `useFactory(l => l.notifications, inject:[WHATSAPP_LINES])` exported; module is `@Global()` and imported in `app.module.ts`. Injectors (`message.dispatch.ts`, `inbound-media.service.ts`, `inbox/read-receipts.ts`) rely on the global module; no circular import. **Proved:** throwaway vitest compiled `AppModule` with the REAL `lines()` factory (no override) for chat unset and chat set: both compile, `get(WHATSAPP_CLIENT) === lines.notifications`, `lines.chat.configured()` = false/true respectively, `lines.chat.canUploadSamples()` = false. Probe deleted.
- **chatGaps boot log**: `onModuleInit` logs one `Logger.warn` with key NAMES only; triggered by any of the five `WA_CHAT_*` keys; token counted present via `WA_ACCESS_TOKEN`; order PHONE, WABA, TOKEN — matches §13.1.5.
- **LinesCheck Graph calls** (`lines.check.ts`): `GET {encodeURIComponent(phoneId)}?fields=display_phone_number,verified_name,quality_rating,status,name_status,code_verification_status` and `GET {encodeURIComponent(wabaId)}/subscribed_apps` — correct Graph nodes/edges, all six fields exist on WhatsAppBusinessPhoneNumber. Only GET (`graphJson` default method). Per-call `attempt()` catches every rejection into `errors[]` (step, WaError code or null, message); outer `Promise.all` over lines can therefore never reject from a Graph failure. Unconfigured line → `configured:false`, all null, `subscribed_apps:null`, `errors:[]`, zero requests. `timeoutMs = 8000`, `fetch` overridable. `app_id` = `WA_APP_ID` / `WA_CHAT_APP_ID`, no fallback.
- **No secret leak**: view carries ids only; error `message` is Meta's `error.message` (never contains the token), `WhatsApp HTTP {status}`, `Unexpected WhatsApp response` (zod details NOT copied into the view), or `WhatsApp request failed: <fetch error>` (no headers/URL token). Token never logged.
- **webhookState** (`web/.../line-status.ts`): null→unknown, []→none, app_id null→unverified, match→ours, else other — exactly §13.10.
- **Template sync switch** (`template.registry.ts`): `requireSync()` is the first statement of `verifyAll()` (before `requireConfigured`) and of `submit()` (before the 404/409 checks); throws `waHttpError('template_sync_off', 409)`; `onApplicationBootstrap` returns before arming the 5 s timer when sync is off; `syncOn()` reads env per call. `templates.controller.ts` unchanged.
- **WA_ALLOWED_RECIPIENTS parsing** (probe through real `loadEnv`): unset / `''` / `'   '` / `'\t'` → `undefined` (= unrestricted, per contract only for blank); `','` and `' , '` → boot throws `(no number in the list)`; `'abc'`, `'0100123'`, `'00201001234567'` → boot throws naming the item; `'+20 100 123 4567,'`, `'201001234567'`, `'+20-100-(123)-4567'` → `['+201001234567']`; duplicates de-duped. `recipientAllowed`: null/undefined → true, `[]` → false, compares `'+' + digits(to)`. Fail-closed as specified; same parsing in every environment (no prod/staging branch, none required by contract). `main.ts` calls `loadEnv()` at boot, so a bad list stops the API.
- **WA_TEMPLATE_SYNC** (probe): unset/blank → true; `false`/`FALSE`/`0`/`no`/`off` → false; `' false '` or a typo → boot throws (fail closed, not silently true).
- **SendGate.view**: `restricted: true` only via spread when the list is non-null; `state()` unchanged (notifications mandatory).
- **Permissions/parity**: `LinesController.check` is `@Post('check') @HttpCode(200) @Permissions('templates.manage')`, `@ApiTags('messaging')`; `access-before.json` has `"LinesController.check": ["admin"]` between `LessonsController.overview` and `LivekitWebhookController.receive`. `pnpm --filter api exec vitest run src/modules/whatsapp/{lines,whatsapp.client,template.registry,send-gate}* src/env* src/common/auth` → 20 files / 153 tests green.

### Findings

#### F1 — minor — `override_callback_uri` is read from the wrong level of Meta's `subscribed_apps` answer
- File: `apps/api/src/modules/whatsapp/meta-shapes.ts:72-79` (and `lines.check.ts:63`)
  ```ts
  whatsapp_business_api_data: z
    .object({ id: optional, name: optional, link: optional, override_callback_uri: optional })
  ```
  `override_callback_uri: a?.override_callback_uri ?? null` (reads it inside `whatsapp_business_api_data`).
- Meta's documented answer to `GET /{WABA_ID}/subscribed_apps` (Webhook overrides docs) puts the override NEXT TO `whatsapp_business_api_data`, not inside it:
  `{"data":[{"whatsapp_business_api_data":{"id":"…","link":"…","name":"…"},"override_callback_uri":"https://…"}]}`.
  The contract (§13.9) copied the wrong nesting, and the stub (`tools/wa-stub/src/diagnostics.ts:35`), the fakes and the tests copy it too, so everything is green but does not match Meta.
- Failure: on real Meta, a WABA-level callback override (for example a CRM that redirected the WABA's webhooks) is silently dropped (`override_callback_uri: null`). The «عنوان استقبال بديل» line never shows, so the admin is not told why inbound messages go elsewhere. That is the exact case docs/09 (e) says this diagnostic is for. `webhookState` is not affected.
- Smallest fix: in `subscribedAppsSchema`, add `override_callback_uri: optional` as a sibling of `whatsapp_business_api_data` in the item object, and map `override_callback_uri: item.override_callback_uri ?? a?.override_callback_uri ?? null` (this tolerates both shapes). Align the stub's `diagnostics.ts` and the fakes with the sibling shape, and fix the shape in contract §13.9.
- Proved: partly. A probe fed the documented Meta shape (sibling field) through the real `LinesCheck`, and the result was `[{"id":"app1","name":"CRM","override_callback_uri":null}]`, so the value is dropped. The shape of Meta's answer is from Meta's webhook-override docs as I recall them, and was not checked online (no network allowed).

#### F2 — minor — when the chat phone id is the same as the notifications one, the chat line is turned off with no warning
- File: `apps/api/src/env.whatsapp.ts:38` together with `:87-96`
  ```ts
  if (phoneNumberId === env.WA_PHONE_NUMBER_ID) return null;
  ```
  `chatGaps` reports only missing PHONE/WABA/TOKEN, so it returns `[]` in this case.
- Failure: the owner pastes the notifications number id into `WA_CHAT_PHONE_NUMBER_ID` (an easy copy-paste mistake when setting up two WABAs). `lineEnvs().chat` is null and `lineNumbers().chat` is absent, so the chat line is fully off. The boot log says nothing, because every `WA_CHAT_*` key is "present". The only sign is the diagnostics card showing chat as «غير مضبوط على الخادم» with no reason. This matches the contract as written (§13.1.2 / §13.1.5), so it is a gap in the contract, not a deviation from it.
- Smallest fix: in `chatGaps`, when `WA_CHAT_PHONE_NUMBER_ID === WA_PHONE_NUMBER_ID`, push a name such as `WA_CHAT_PHONE_NUMBER_ID (same as WA_PHONE_NUMBER_ID)`, or log a separate one-time warn in `WhatsappModule.onModuleInit`. This needs a one-line contract note.
- Proved: no runtime probe. It follows directly from reading the code: `chatGaps` only checks `=== undefined`.

No blocker or major findings in this lens.

## Lens 3 — DB, shared, i18n, docs

### Checked and correct

- **v_threads lineage.** Only `20261001000142_messaging.sql` defines `v_threads` before 290 (`164_teacher_mode.sql` mentions it in a comment only). 142's `select m.*` expands to the 8 `last_message` CTE columns. 290 lists those 8 explicitly in the same order, and the other 12 keep the same names, expressions and types. `last_inbound_line` is appended last. `CREATE OR REPLACE VIEW` is legal here: no column is dropped, renamed, reordered or retyped.
- **Options and grants.** `with (security_invoker = true)` is restated, so the option is not lost on replace. `CREATE OR REPLACE` keeps the 142 ACL, and the repeated `revoke all … from anon, authenticated` / `grant select … to service_role` are idempotent. No later migration grants or revokes on `v_threads` or `messages`. RLS on `messages` is policy based, with no column-level grants, so the new column needs no grant. No new table, so no new RLS is needed.
- **`array_agg(line order by created_at desc, id desc)[1]`.** `array_agg` accepts an enum (anyelement) and keeps NULLs. So a newest inbound row with no line gives NULL, not an older row's line, as documented. A phone with only outbound rows gives NULL through the LEFT JOIN. The `id desc` tiebreak is deterministic.
- **Enum and column.** `create type public.wa_line` is used in the same file without trouble; only `ALTER TYPE … ADD VALUE` is restricted inside a transaction. Plain `create type` matches every other migration, which run once. `add column line public.wa_line` is nullable with no default, so there is no table rewrite and only a brief ACCESS EXCLUSIVE lock.
- **`set local lock_timeout = '5s'`.** Migrations run through `supabase db push` (`db-migrate.yml:103-108`, `deploy-staging.sh:22`). The CLI sends each file as one pgx batch in one implicit transaction. `SET LOCAL` therefore lasts to the end of that file's transaction and cannot leak into the session. At worst Postgres warns about it. No other migration uses `set`. `migration-check.mjs` lint (parentheses, quotes, trailing `;`) passes, and the manual rollback is all in `--` comments.
- **Readers of the view.** No other tooling reads `v_threads`: there is no hit in `tools/migrate`, scripts or seed. The API reads it through the mapper only.
- **`packages/db/src/types.ts`.** It has exactly the 6 hand edits from §13.14. Each is in alphabetical position (`lesson_id` < `line` < `media_id`, `last_inbound_at` < `last_inbound_line` < `last_media_mime`, `wa_line` after `user_role`). Row, Insert and Update are typed as `Enums['wa_line'] | null` and `?:`. The `Constants` entry is present. Prettier style matches.
- **Shared types.**
  - `WA_LINES = ['notifications','chat'] as const satisfies readonly Enums<'wa_line'>[]` and `WaLine` match the DB enum values and order.
  - `ThreadView.last_inbound_line?` and `MessageView.line?` are added.
  - `TemplateView` and `SendGateView` moved verbatim to `template-views.ts`, and `SendGateView` gained `restricted?`.
  - `LineCheckView` matches §13.8 field for field.
  - `index.ts` re-exports both new files.
  - `enums.test.ts` adds `['waLine', E.WA_LINES]`.
  - `packages/shared` vitest: 115 files and 1676 tests pass.
- **i18n.** I compared the files with a scratchpad script (`scratchpad/i18n.mjs`, `scratchpad/doccmp.mjs`):
  - **Parity:** ar and en have full key parity, with no missing keys either way.
  - **Placeholders:** they match in all 31 new keys (`{line}`, `{url}`, `{time}`, `{message}`, single-brace as the app's `.replace` expects).
  - **Contract:** every new ar and en string equals the §13.11 table character for character.
  - **No removals or renames:** nothing was removed or renamed.
  - **Arabic quality:**
    - No Eastern digits.
    - No Egyptian dialect in any new string: I checked for مش, عايز, دلوقتي, بتاع, كده, إزاي, رسايل, اتبعت and found none.
    - The Arabic is clear Modern Standard Arabic.
    - The vocabulary is consistent: خط الإشعارات / خط المحادثات, الطابور, ميتا.
- **UI wiring of each key.**
  - `enums.waLine.*` → `LineBadge`, `LineRow`, mobile `lineWord`.
  - `inbox.line.replyFrom` → `reply-from.ts` and mobile `LineNote`. Both are shown only when `session_open` and the line is non-null, which matches «سيصل ردّك عبر».
  - `inbox.error.line_not_configured` → generic `t.inbox.error[code]` lookup in web `TextComposer` and mobile `sendError`. The API throws it in `thread-send.service.ts:52`.
  - `templates.error.template_sync_off` → generic lookup in `templates/api.ts`. Thrown by `template.registry.ts:123` (409).
  - `messages.errors.131030` → generic lookup in web `format.ts` and mobile `message-text.ts`.
  - `recipientsRestricted` → `ServerGateNote`. Its claim that other numbers' rows "stay in the queue" is true: `sender.queries.ts` `due()` and `holdAutomatic()` both scope by `.in('phone_e164', allowed)`.
  - All `templates.settings.lines.*` → `LinesCard`, `LineRow`, `LineFacts`. Web tests (messaging, LineBadge, reply-from): 12 files and 75 tests pass.
- **docs/12 §13 spot checks against code.**
  - All 7 env keys are in the `env.ts` schema. `WA_TEMPLATE_SYNC` uses `z.preprocess(blankIsUnset, z.stringbool().default(true))`. `env.whatsapp.ts` and `env.recipients.ts` exist.
  - `LinesController` is at `@Controller('messaging/lines')` with `@Post('check')`, `@HttpCode(200)` and `@Permissions('templates.manage')`.
  - `access-before.json:120` has `"LinesController.check": ["admin"]` between `LessonsController.overview` and `LivekitWebhookController.receive`.
  - `requireSync()` is the first call in `verifyAll()` and `submit()`, and `onApplicationBootstrap` returns early.
  - Every file path named in `docs/15-two-lines-work-packages.json` exists in the tree.
  - `.github/` is untouched, as promised.
- **Env merge (docs/09 §(a)).** `deploy-staging.yml:184-188` merges `WA_API_BASE WA_API_VERSION WA_WABA_ID WA_ACCESS_TOKEN WA_APP_ID WA_APP_SECRET WA_VERIFY_TOKEN` through `env-merge.mjs`. `env-merge.mjs` overrides only NON-EMPTY values in place and keeps everything else. So the doc's list and its "whenever they are NON-EMPTY there" are exact, and the new keys, `WA_PHONE_NUMBER_ID` and `MESSAGING_ENABLED` do survive a deploy. `workflows.test.mjs` FLAGS covers `WA_CHAT_PHONE_NUMBER_ID` and `WA_ALLOWED_RECIPIENTS`. `deploy-staging.sh` does not touch `.env`.
- **docs/09 test-credentials section.**
  - (c) `132001` is not in `RETRYABLE` (`packages/shared/src/messaging/wa.ts:55`), so the "not retryable" claim is correct.
  - (h) 131030 = Meta's "recipient not in allowed list". The guidance to add and verify test recipients is correct.
  - (e) lists callback URL, the same verify token and the `messages` field.
  - No secret values appear: only placeholders and the pre-existing public academy number.

### Findings

1. **major — docs/09-deployment.md:212 (same text in docs/12-phase4-contracts.md §13.13(b))**
   - **Text:** «**(b) Order.** Set `WA_ALLOWED_RECIPIENTS` and `WA_TEMPLATE_SYNC=false` BEFORE `MESSAGING_ENABLED=true`, in the same restart.»
   - **Failure scenario:** The template sync does not depend on `MESSAGING_ENABLED`. `TemplateRegistry.onApplicationBootstrap` (`template.registry.ts:43-46`) runs `verifyAll()` 5 s after every boot whenever `client.configured() && syncOn()`. Today staging has no WhatsApp credentials (docs/09:98). The owner follows (a) and "THEN switch the server to test credentials", restarts, and only plans to add the guard flags later, before `MESSAGING_ENABLED`. On that first restart with the test WABA configured, `verifyAll()` runs `syncPatch` (`template-sync.ts`) on every row. Each approved template that is not on the test WABA (all except `hello_world`) is set to `status: 'missing'`. That is exactly the registry damage `WA_TEMPLATE_SYNC` exists to prevent (§13.9). The same applies when a later deploy's env-merge pushes test values on a server where the switch was never set.
   - **Smallest fix:** Reword (b): "Set `WA_TEMPLATE_SYNC=false` (and `WA_ALLOWED_RECIPIENTS`) on the server BEFORE, or in the same edit and restart as, switching any `WA_*` credential to test values. The boot template sync runs whenever WhatsApp is configured, regardless of `MESSAGING_ENABLED`. Only then set `MESSAGING_ENABLED=true`."
   - **Proved:** yes, by reading `template.registry.ts:24,43-46,73-82` (no `MESSAGING_ENABLED` check on the boot path) and `template-sync.ts` `syncPatch` (`!meta` → `'missing'` for any row that is not `not_submitted`).

2. **minor — docs/09-deployment.md:195**
   - **Text:** «A call error naming 190 = a bad or expired token for that line.»
   - **Failure scenario:** `LineRow.tsx` `CallErrors` (line 62) renders only `<bdi dir="auto">{e.message}</bdi>`. `LineCheckView.errors[].code` is never shown. Meta's message for 190 is text like "Error validating access token: …", so the admin never sees "190" and cannot apply this runbook check.
   - **Smallest fix:** Either show the code in `CallErrors` (for example `{e.code !== null && <Ltr>({e.code})</Ltr>}`), or reword the doc to "a call error about the access token".
   - **Proved:** yes, by reading `LineRow.tsx:51-68` and `lines.check.ts` `attempt()` (the code is stored in `errors[].code`, the message is `WaError.message`).

3. **minor — docs/09-deployment.md:121**
   - **Text:** «`false` stops the boot template sync, «راجع حالة القوالب» and «ابعته لميتا للموافقة» (409 `template_sync_off`)»
   - **Failure scenario:** The submit button label in the UI is now «أرسله إلى ميتا للاعتماد» (`ar.json` `templates.submit`), after the owner's 2026-10-03 switch to Modern Standard Arabic. The new row (added by this branch) quotes an old dialect label that the admin will not find on the page.
   - **Smallest fix:** Replace «ابعته لميتا للموافقة» with «أرسله إلى ميتا للاعتماد» in this new row. Older rows outside this diff have the same stale quote, but that is pre-existing.
   - **Proved:** yes, by `grep '"submit"' packages/shared/i18n/ar.json` → «أرسله إلى ميتا للاعتماد». «ابعته لميتا» appears nowhere in `ar.json`.

4. **minor — docs/09-deployment.md:195 and :215, checklist completeness**
   - **Text:** «… = the webhook will not arrive (fix the subscription first)» and «(e) Webhooks per app. Each Meta app needs its OWN callback URL (ours), the SAME `WA_VERIFY_TOKEN`, and the `messages` field subscribed.»
   - **Failure scenario:** For a separate chat Meta app or a newly created test WABA, the app must also be subscribed to that WABA (`POST /{waba_id}/subscribed_apps` with that line's token, or the dashboard's WABA subscription). The diagnostics report «لا يوجد تطبيق مربوط بالحساب», but neither the checklist nor the verify bullet says how to subscribe. An owner who sets only the callback URL, verify token and `messages` field still receives nothing.
   - **Smallest fix:** Add to (e): "and the app subscribed to its WABA (`POST /{WABA_ID}/subscribed_apps` with that line's token; «افحص الخطوط» then shows «التطبيق مربوط بالحساب»)."
   - **Proved:** no. This is a doc-completeness gap; I could not verify Meta's dashboard behaviour (no network).

No defects found in the migration SQL, `types.ts`, the shared enums and types, or i18n parity and quality.

