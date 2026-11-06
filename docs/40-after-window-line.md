# After-window line (owner 2026-11-06) and configurable lines

Owner: «make a new line for contacting users after the 24 h limit; staff do not know which line; past 24 h open a session on the risky line; the other chat continues on the chat line; creating lines configurable». Risk accepted by the owner. **The «Review corrections» at the end override the spec.** Production comms_source is `legacy` (2026-11-06): the lane needs module mode.

## Lines model

A line is a wa_numbers row; the enum stays as it is. Configurable lines already exist at the number level: «الأرقام» lets an admin create, edit and enable any number of numbers per role (migration 620: one live default per role, any number of other rows). The only addition is one boolean that turns a chat-role number into the after-window line:

- **Schema.** `wa_numbers.after_window boolean not null default false`, with this check constraint: `not after_window or (purpose='chat' and not is_default and provider='evolution' and evolution_mode='baileys' and not evolution_auto_sends)`.
- **What the admin sees.** Line name = label. Role = one select in «الأرقام» with four options: notifications, chat, after_window, calls. after_window maps to `purpose='chat'` plus `after_window=true`. Number = phone_number_id / Evolution instance. Enabled = enabled. Order among several after-window numbers = fallback_rank (roleOrder already sorts by it). When one number is capped or offline, the next one is used.
- **Why staff never see which line.** Messages are stamped `line` = the number's purpose (number-route.ts:120; webhook receivingNumber / evolutionNumber). Lane traffic is therefore `line='chat'`: LineBadge, t.enums.waLine, v_threads and the thread_summaries chat window all treat it as «خط المحادثات». Staff never see a different line.
- **Why not a new wa_line value.** It needs ALTER TYPE in its own migration and cannot be dropped later. It also touches WA_LINES / NUMBER_PURPOSES / ROLE_KEYS / numberIds / onMessagingLine (sender.repo.ts:69 would drop the rows), the window filters in v_threads and thread_summary_refresh (984:51-53, 992:155), window-rules `line==='chat'`, and i18n. Roughly 1 migration, 8-12 production files and 20-30 test files, and the lane's name would show in every badge.
- **Why not lines as a table.** It replaces the enum in ~106 production and ~176 test/fake files and 9 migrations (messages.line is on the hottest table). v_threads and thread_summaries would need a rewrite because they have role-named columns (last_chat_inbound_at…).
- **Built-in roles.** notifications, chat and calls stay enum values.

The lane is used only when all of these hold:
- comms_source is module (overlayNumbers() !== null). Under legacy it is inert and today's hold applies.
- The default chat number keeps the 24 h window (Kapso, Meta or CRM). If the default chat number is already Baileys, PR #645's goesFree wins and the lane is moot.

## After-window flow

- 0. **Prerequisites.** Build on develop after PR #645 (evolution) and PR #649 (app_send_until) are merged. The kill switch (settings key `after_window_line`, default false) must be on.
- 1. **Staff sends while every window is closed.** Staff send a text, file, sticker, GIF or forward through chatLine → textLine (apps/api/src/modules/messaging/inbox/send/text-line.ts). pickSend({thread, now, windows, afterWindow: true}) returns session_closed when no number the family wrote to in the last 24 h can send.
- 2. **Order in textLine** (thread present):
     - (a) goesFree, from #645: the default chat number is Baileys → free text, unchanged.
     - (b) NEW: `const laneId = await at.lane?.(thread.phone_e164, at.now)`. If laneId is set, return `{ line: 'chat', number_id: laneId }` with no error_code.
     - (c) Otherwise today's code: chatOnKapso → `{line:'chat', number_id: activeNumberId('chat'), error_code: AWAITING_REPLY}` (hold plus reopen template); Meta/CRM → 409.
     - (b) comes before the chatOnKapso gate, so a Meta main line also uses the lane.
     - No thread (a number that never wrote) → still 409. The lane never cold-starts a conversation that has no thread.
- 3. **AfterWindowLane.pick(phone, now)** (new, inbox/send/after-window/after-window.lane.ts) returns null unless:
     - the setting is on;
     - overlayNumbers() is not null;
     - the candidates are overlay rows with `afterWindow && enabled && env !== null && windowless(env)`, sorted by fallback_rank then created_at.
     - For each candidate, in order, it reads fresh from wa_numbers (`evolution_state, evolution_config->limits`) in one query, because OverlayNumber carries no state and EvolutionStateRepo writes only the DB.
     - It takes the first candidate where all of these hold:
       - `evolution_state === 'open'`;
       - `todayCount < limits.daily_cap`, where todayCount = outbound rows with that number_id, `created_at >= UTC day start` and status in (queued, sending, sent, delivered, read). Counting queued rows is what stops overshoot.
       - The phone is not new to the number, OR `after_window_first_contacts(number, dayStart) < limits.first_contact_cap`.
     - A candidate skipped for a cap rings the admin bell once per number per UTC day.
     - If no candidate qualifies → null → today's hold.
- 4. **Sender, unchanged for lane rows.**
     - numbersPass → routeOf → routeSession honours the stamped number_id (routing.ts:61-65).
     - claimNumber → pacedLater (gap; never sleeps; defers the row) → claim.
     - The dispatch uses the lane's Evolution client.
     - A lane row never carries error_code, so window-rules holdable / heldStep never touch it, and Baileys never returns 131047 or 422.
- 5. **Family replies on the lane number.** The Evolution webhook (module mode) runs InboundService.handle and stores `{line:'chat', number_id: lane}`. The thread is keyed by phone_e164, so the reply lands in the same family thread. v_thread_numbers opens a 24 h window on the lane number only.
- 6. **Next staff texts.** pickNumber → replyNumber picks the number with the newest open window, i.e. the one the family last wrote to within 24 h (main or lane). When every window is closed, step 2b picks the lane again. This is sticky by design: after a lane reply, staff keep sending from the lane until the family writes to the main number.
- 7. **Automatic and template traffic never uses the lane.**
     - pickNumber drops afterWindow numbers unless `input.afterWindow === true`, which only textLine sets. meeting-invite.sender.ts:74, call-permission.service.ts:78 and reaction-line.ts:27 therefore never get the lane.
     - Templates: Baileys has `templateList:false`, so no message_template_numbers row exists for it and approvedOn() is false.
     - The constraint forces `evolution_auto_sends=false`, so the dispatch refuses any job row (created_by null) via evolutionAutoOff.
     - Rows stamped by line only (jobs, legacy) route to the role default via routeSession, never to the lane.
- 8. **Fallback to today's hold when the lane breaks after enqueue.** New sender/pace/lane-fallback.ts `toHold(rowIds, laneId)` runs one compare-and-set update: `set number_id = activeNumberId('chat'), error_code = AWAITING_REPLY, next_attempt_at = null where id in (...) and status = 'queued' and number_id = laneId and app_send_until is null`. The next pass holds the rows as today (WindowHold.hold → ReopenRequest). It fires on:
     - (a) failIfOff, where the number is afterWindow and switched off by an admin or by the 463/ERROR restriction, instead of failing with EVOLUTION_NUMBER_OFF;
     - (b) the per-number credential pause (evolution-errors.ts `credential: 'evolution'`: 401/403/404/«connection closed|not connected»), meaning nothing was sent; it moves all queued lane rows;
     - (c) the claim-time pacer cap (`sent >= dailyCap`), only for an afterWindow number, instead of deferring to the next UTC day.
     - It never fires on uncertain errors (5xx `uncertain:true`, timeouts). Those stay failed as today, to avoid a double send.
- 9. **Held texts when the family answers on the lane** (fixes release per phone). WindowRepo.lastChatInbound(phone) returns `{at, numberId}` (newest chat-line inbound). In window-release / answered:
     - inbound on the row's own number, or numberId null (legacy) → release as today;
     - inbound on an afterWindow number, with the row's app_send_until null and outside #649's grace (notAppSending) → CAS move to that number with error_code cleared, then release, then ReopenCancel.afterAttach(row) to drop a still-queued reopen template;
     - inbound on another non-lane chat number → today's behaviour.
- 10. **Compatibility with #649.**
     - Lane rows have no AWAITING_REPLY, so appSendable() is false and «أرسل عبر واتساب» never shows on them; the main number's app never echoes them.
     - Rows moved back by the fallback are ordinary held rows on the main number, so the button and ManualEcho (number_id and line agree) work as today.
     - No code path re-stamps a row whose app_send_until is set or within grace.
- 11. **Composer.** threads.service reads the setting once per list and passes `laneOn` (setting on and at least one afterWindow overlay number sendable) to threads.mapper: `session_open = messagingWindowOpen(row, now) || windowless(chat) || laneOn`. Staff then see a normal open composer: no line, no held note. If the lane is not ready at send time, the text simply shows the existing held bubble.
- 12. **Teacher mode is unchanged.** chatLine(teacher) → sendLine → 409. sendLine does not pass afterWindow.

## Data changes

- **packages/db/supabase/migrations/20261106000710_wa_numbers_after_window.sql** (expand-only, idempotent, `set local lock_timeout='5s'`):
  - `alter table wa_numbers add column if not exists after_window boolean not null default false`.
  - Constraint `wa_numbers_after_window_check`, added NOT VALID then validated: `not after_window or (purpose='chat' and not is_default and provider='evolution' and evolution_mode='baileys' and not evolution_auto_sends)`. The set-default RPC (621) then refuses a lane through the check.
  - `create or replace function public.after_window_first_contacts(p_number uuid, p_since timestamptz) returns int`, language sql, stable, security definer, `set search_path=''`. It counts distinct phone_e164 on that number_id whose earliest message (any direction, status <> 'failed') is outbound and at or after p_since.
  - Revoke from public, anon and authenticated; grant to service_role.
  - Write a MANUAL ROLLBACK comment block.
- **RLS** is unchanged: no new table. wa_numbers stays admin-read, with writes through the API only (620:42-47). The new function is service_role only.
- **Indexes:** none new. The today-count and first-contact reads use messages_external_number_idx (number_id, created_at desc) from 922 and messages_number_id_idx from 620.
- **packages/db/src/types.ts:** regenerate (wa_numbers.after_window and the new function).
- **packages/shared/src/messaging/numbers/evolution-config.ts:** add `first_contact_cap: z.number().int().min(0).max(1000).default(10)` to evolutionLimitsSchema. It lives in jsonb evolution_config.limits, so no migration. The existing daily_cap (default 60), gap_ms (3000) and error_trip (3) are reused.
- **packages/settings/src/domains/messaging.ts:** new key `after_window_line`, boolean, default false (the kill switch). Add it to layout.ts and to value-groups.ts under `messages`. This is registry-only, like chat_reopen_template, which has no migration. The web BoolEditor (ValueEditor.tsx:15,53) renders it, so no new editor.
- **apps/api/src/modules/messaging/numbers/config/numbers.config.ts** plus numbers-overlay.ts: OverlayNumber gains `afterWindow: boolean`, read from the row. numberIds and ROLE_KEYS are unchanged because a lane is never a default.
- No enum change and no v_threads / thread_summaries change. Lane inbound is line='chat' and correctly counts as the chat window.

## API / UI

- **packages/shared/src/messaging/numbers/schemas.ts:** create and update gain `after_window: z.boolean().default(false)`. The refine mirrors the DB check (chat, evolution baileys, not default, auto_sends false). The error key goes in ar.json.
- **apps/api numbers module** (numbers.repo.ts / numbers.mapper.ts / numbers.patch.ts / numbers.service.ts): persist and return after_window. Refuse set-default on a lane (409 with an Arabic message).
- **NEW apps/api/src/modules/messaging/inbox/send/after-window/after-window.rules.ts** (pure): `laneCandidates(numbers)` (filter and sort by fallback_rank) and `laneReady(c: {state, today, firstToday, isNew, limits})` → 'ok' | 'off' | 'daily_cap' | 'first_contact_cap'.
- **NEW after-window.repo.ts:**
  - `states(ids)`: one wa_numbers select of id, evolution_state, evolution_config.
  - `todayCount(numberId, since)`.
  - `knows(numberId, phone)`: an exists query.
  - `firstContacts(numberId, since)`: the RPC.
- **NEW after-window.lane.ts:** an @Injectable AfterWindowLane with `pick(phone, now) → Promise<string|null>`. It reads SettingsService (the after_window_line slice, readSlice pattern as in window.settings.ts) and the overlay. It rings via `PushService.notifyAdmins('reminder_failed', {subject: 'after_window_cap:<id>:<yyyy-mm-dd>', vars: {template: <ar words>, name: label}})`, the same dedup-subject pattern as evolution-restriction.ts.
- **text-line.ts:** LineAt gains `lane?: (phone: string, now: Date) => Promise<string | null>`. textLine inserts the step 2b branch after goesFree and before the chatOnKapso gate, and passes `afterWindow: true` to pickSend. The inbox send service wires `lane: (p, n) => this.lane.pick(p, n)`. text-line.ts stays under 150 lines; if not, move freeChat/goesFree to text-line.free.ts.
- **send-number.ts:** SendPickInput gains `afterWindow?: boolean`. pickNumber drops numbers with `afterWindow` unless it is set, via one filter on `input.numbers` before byId and numberWindows.
- **NEW apps/api/src/modules/messaging/whatsapp/sender/pace/lane-fallback.ts** plus a lane-fallback.repo.ts `toHold({ ids | numberId, laneId })` compare-and-set update (step 8). Callers:
  - message.job.ts failIfOff: if the overlay row is afterWindow → toHold, else failOff as now;
  - the per-number credential pause in message.sender.ts / hold-key.ts, when it pauses an afterWindow number → toHold for all its queued rows;
  - evolution-pace.ts laterOf: when the cap is hit on an afterWindow number → toHold instead of next-day deferral.
- **evolution-pace.repo.ts deferFilter:** DeferInput gains `pinnedOnly?: boolean`, set for afterWindow numbers. It omits the `and(number_id.is.null,…)` branch, so a paced lane text never moves the family's unstamped reminders or templates (fixes the 'pacer blocks another line' break).
- **window.repo.ts:** `lastChatInbound(phone)` returns `{at, numberId}` from messages (newest inbound, line='chat', for the phone). New method `moveToNumber({id, from, to})` does a compare-and-set update with `app_send_until is null`.
  **window-rules.ts:** `answered` / a new `releaseVia(row, inbound, lanes)` → 'release' | 'move' | 'keep' (pure).
  **window-release.ts:** applies it and calls `ReopenCancel.afterAttach` after a move.
- **threads.service.ts / threads.mapper.ts:** the mapper gets an options object (max 3 params) with `laneOn`, so `session_open` includes laneOn. threads.service computes laneOn once per request.
- **Web «الأرقام»:**
  - number-form.ts: role value `'after_window'` ↔ `{purpose:'chat', after_window:true}` on load and save. Choosing it forces the provider to evolution/baileys and auto_sends off, and hides the default toggle.
  - NumberFormFields.tsx: a fourth option in the role select.
  - NumberCard.tsx: a «بعد 24 ساعة» badge on lane cards only.
  - NumberActions.tsx: hide «اجعله افتراضيًا» for lanes.
  - evolution/config/SendingSection.tsx: a first_contact_cap field next to daily_cap.
  - Nothing changes in the inbox (web or mobile): no line or number is shown.
- **packages/shared/i18n/ar.json** (Modern Standard Arabic):
  - `numbers.purpose.after_window` = «دور المحادثات بعد انقضاء 24 ساعة»;
  - `numbers.afterWindow.help` = «رقم احتياطي يرسل رسائل الموظفين حين تنقضي نافذة الـ24 ساعة على رقم المحادثات. خطر الحظر أعلى؛ لا تُرسل منه الرسائل الآلية ولا القوالب.»;
  - the cap bell text;
  - the setting label «إرسال رسائل ما بعد 24 ساعة من الرقم الاحتياطي».
  - Also update en.json.
- **tools/wa-stub:** the evolution branch has no Evolution fake (grep is empty). Add `POST /message/sendText/:instance` (records the body and returns a key.id) and a helper that posts an Evolution `messages.upsert` webhook to the API, for the e2e.
- **docs/19-messaging-drivers.md:** add a section «خط ما بعد 24 ساعة» describing the flow, the fallback rules and the kill switch.

## Safety

- **Kill switch.** The settings key `after_window_line` (default false) switches the lane off globally right away: AfterWindowLane.pick returns null and laneOn is false. Rows already queued on the lane still send. To stop those too, disable the number, which triggers the fallback to hold. There is also a per-number kill: enabled=false in «الأرقام».
- **Pacing per number without blocking the sender loop.** This reuses #645's pacedLater/reserveSlot: the row's next_attempt_at is deferred and the pass continues, gap = limits.gap_ms per number. The deferFilter `pinnedOnly` fix keeps a lane deferral from moving the family's notification rows.
  `ponytail:` slots are in memory per process, so a restart forgets the gap. Move them to the DB if more than one API instance sends.
- **Daily cap.** At enqueue, rows created today on the lane (queued, sending or sent) are counted against limits.daily_cap; when the cap is reached the text goes to the next lane number, else to today's hold. The claim-time pacer cap stays as a backstop and moves rows back to hold, never to the next day.
  `ponytail:` two simultaneous enqueues can overshoot by one or two. Use an advisory lock per number if that matters.
- **First-contact cap.** Phones new to the lane number are counted per UTC day via `after_window_first_contacts`, against limits.first_contact_cap (default 10). Above the cap, new phones fall back to hold, while families already known to the lane keep using it.
- **Restriction auto-disable.** This reuses #645's EvolutionRestriction: error_trip ERRORs (default 3) within 15 min switch the number off and ring the admins once. Its queued rows then fall back to today's hold (toHold) instead of failing with EVOLUTION_NUMBER_OFF. Only an admin can turn it back on, and evolution_enabled_at ignores replayed errors.
- **Admin bell.** The existing restriction ring, plus a new cap ring (subject `after_window_cap:<id>:<day>`, so at most one per number per day).
- **No double send.**
  - Every re-stamp is a compare-and-set on `status='queued' and number_id=<from> and app_send_until is null` (and outside #649's grace).
  - The claim stays atomic (queued → sending).
  - The fallback runs only on pre-send failures (credential/line-down, off, cap), never on 5xx/timeout `uncertain`.
  - Lane rows never become appSendable.
- **Idempotency.** The lane decision is made once at enqueue and stored on the row (number_id). Later passes only follow that stamp. A moved row cannot move again, because its number_id no longer matches `from`.
- **Scope fences.**
  - Templates and automatic or job rows never use the lane: pickNumber filter, approvedOn false, constraint `evolution_auto_sends=false`, and the dispatch's evolutionAutoOff.
  - A thread is required, so the lane never cold-messages a phone that never wrote.
  - Teachers are excluded.
  - Under legacy mode the lane is inert.
- **Ban and Terms risk.** Baileys is an unofficial WhatsApp Web client. The ban risk sits mainly on the lane SIM, and the caps keep its volume low. The WhatsApp Terms risk is company-wide; the owner accepts it explicitly in the PR description.

## Tests

- **after-window.rules.test.ts:**
  - ordering by fallback_rank;
  - a disabled or env-null number and a non-baileys row are excluded;
  - state other than open → off;
  - today ≥ daily_cap → daily_cap;
  - a new phone at first_contact_cap → first_contact_cap, while a known phone → ok;
  - the first candidate is capped and the second is ok.
- **after-window.lane.test.ts** (fakes for repo, settings, overlay, push):
  - setting off → null;
  - legacy (overlay null) → null;
  - picks the first ready number;
  - the cap skip rings once with a dated subject;
  - the repo throws → null (fail closed to hold).
- **text-line.lane.test.ts:**
  - session_closed + lane → `{line:'chat', number_id: lane}` with no error_code;
  - a Meta main line + lane → lane, not 409;
  - lane null + Kapso → AWAITING_REPLY as today;
  - no thread → 409;
  - teacher → 409;
  - goesFree (Baileys default) still wins;
  - an open window on main → main, and the lane is not called.
- **send-number.after-window.test.ts:**
  - pickNumber excludes the lane without afterWindow;
  - with afterWindow, the family wrote to the lane 2 h ago → lane;
  - wrote to main 1 h ago and the lane 3 h ago → main;
  - the lane window is older than 24 h → session_closed.
- **schemas.after-window.test.ts** plus **number-form.after-window.test.ts:**
  - the role ↔ {purpose, after_window} mapping;
  - refine failures (kapso lane, default lane, auto_sends on).
- **lane-fallback.test.ts:**
  - failIfOff on a lane → toHold with the main chat id and AWAITING_REPLY;
  - on a non-lane → failOff as today;
  - the compare-and-set matches 0 rows when already moved;
  - a row with app_send_until set is skipped;
  - a credential pause moves all queued lane rows;
  - 5xx/uncertain → no move.
- **evolution-pace.repo.test.ts:** deferFilter with `pinnedOnly` has no number_id.is.null branch; the default keeps it.
- **window-rules.release.test.ts:**
  - inbound on the row's own number → release;
  - inbound on the lane → move then release;
  - lane inbound and app_send_until pending → keep;
  - numberId null → release as today.
- **window-release.test.ts:** a move calls ReopenCancel.afterAttach.
- **threads.mapper.test.ts:** session_open is true with laneOn and a closed window, and false without laneOn.
- **Web tests:**
  - NumberFormDialog.after-window.test.tsx: selecting the role locks provider/mode and hides the default toggle;
  - NumberCard badge shows for lanes only.
- **DB check, packages/db SQL test (pgTAP/regression, following the repo's existing pattern):**
  - the constraint rejects after_window on a kapso, default or notifications row;
  - after_window_first_contacts counts only phones whose first lane message is outbound today;
  - anon and authenticated cannot execute it.
- **E2E** (apps/web Playwright, local Supabase + wa-stub Evolution route), new spec `inbox-after-window.spec.ts`. Seed: module mode, a Kapso default chat number, an enabled lane with state open, the setting on, and a family whose last inbound was 2 days ago.
  - (1) A staff text shows as sent with no held note; wa-stub got sendText on the lane instance; the bubble's line badge is «خط المحادثات».
  - (2) Post an Evolution upsert from the family → it appears in the same thread, and the next text goes from the lane.
  - (3) Turn the setting off, send again → held bubble plus a reopen template on the main number.
- All rule-level logic must reach ≥80% coverage (CLAUDE.md rule 4). Before each PR: `pnpm turbo lint typecheck test`, plus `pnpm turbo e2e` for PR 3.

## Phases

- **PR 0 (gate).** Merge #645 and #649 into develop and rebase. Confirm production comms_source (owner step). Without module mode the lane is inert.
- **PR 1 «الأرقام»: create an after-window line** (inert):
  - migration 20261106000710;
  - types regen;
  - the shared schema refine;
  - first_contact_cap in evolutionLimitsSchema;
  - the settings key after_window_line;
  - the numbers API persists after_window and refuses set-default;
  - the OverlayNumber.afterWindow field;
  - the web role option, badge, hidden default action and first_contact_cap field;
  - i18n;
  - unit tests.
  Nothing routes to the lane yet.
- **PR 2 «Send after 24 h through the lane»** (one PR, because sending and fallback must ship together):
  - after-window rules / repo / lane;
  - the textLine branch;
  - the pickNumber afterWindow filter;
  - lane-fallback (failIfOff, credential pause, claim cap);
  - deferFilter pinnedOnly;
  - composer laneOn;
  - the cap bell;
  - unit tests.
  The setting defaults off, so merging changes nothing until the owner enables it.
- **PR 3 «Replies on the lane release held texts», plus e2e and docs:**
  - the window.repo lastChatInbound numberId;
  - the releaseVia move;
  - ReopenCancel after the move;
  - the wa-stub Evolution sendText route and upsert helper;
  - the Playwright spec;
  - the docs/19 section;
  - PHASE_SUMMARY.md.
- Each PR is 3 or fewer independent modules, so a single builder plus a verifier is enough. No Workflow fan-out is needed. Repeat the rules in every builder prompt: files ≤150 lines, ≤3 params, no any or non-null assertions, tests next to the code.

## Owner steps

- 1. Buy a second SIM (a local number the families will recognise as the academy). Put it in a spare phone. Install WhatsApp or WhatsApp Business with the academy name and logo. Warm the number up for a few days: normal chats, no bulk sending.
- 2. Make sure the Evolution server from #645 is running (deploy/evolution: docker-compose, `.env` from `.env.example`). In «التكاملات», set EVOLUTION_API_BASE and EVOLUTION_API_KEY.
- 3. In «الأرقام» → «إضافة رقم», fill in:
     - name, for example «الرقم الاحتياطي»;
     - role «دور المحادثات بعد انقضاء 24 ساعة»;
     - provider Evolution / Baileys;
     - instance name and instance token.
     Save. The number is created disabled.
- 4. Open the number card → «ربط عبر QR». On the spare phone go to WhatsApp → Linked devices → Link a device and scan the code. Wait until the card shows the connected state (open).
- 5. In the number's Evolution settings → Sending, start low:
     - gap 5000 ms;
     - daily cap 20 (raise it slowly week by week);
     - first-contact cap 5;
     - errors before auto-stop 3.
     Keep «automatic sends» off; the form forces it.
- 6. Make sure «مصدر الأرقام» is set to the numbers module (not legacy). Check parity on the «الأرقام» page first. This switch is required: under legacy the lane never sends.
- 7. Enable the number. Then, under «الإعدادات» → messages, turn on «إرسال رسائل ما بعد 24 ساعة من الرقم الاحتياطي».
- 8. Test with your own phone:
     - write to the main number, wait more than 24 h (or use a family thread that is already closed), then send a text from the inbox;
     - it should arrive from the spare number, and your reply should appear in the same thread.
- 9. Watch the admin bell. «أُوقف تلقائيًا» means WhatsApp refused messages and the number was switched off, so texts went back to the old hold. Look at the cause before you re-enable it. «بلغ الحد اليومي» means the daily cap was reached.
- 10. Emergency stop: turn off the setting in step 7, or disable the number in «الأرقام». Texts then go back to today's behaviour (hold plus the reopen template).
- 11. Keep the spare phone charged and online, and do not log WhatsApp out on it. If it disconnects, sends fall back to the hold until you scan the QR again.

## Open questions

- Should held texts from before the rollout (or held while the lane was not ready) be swept onto the lane once it is ready? v1 leaves them on today's hold. They are released when the family replies on any number and moved to the lane if that reply came on the lane. A sweep would deliver week-old texts from a new number.
- Should teachers (chatLine teacher mode → 409) also use the lane after 24 h? v1: no.
- Is it acceptable that staff replies stay sticky on the lane after a family answers there, until the family writes to the main number again?
- Production comms_source was not verified (no DB access). If it is legacy, switching to module mode is a bigger rollout than this feature and needs its own parity check.
- Should media (files, stickers, GIFs) go through the lane too? v1 sends everything chatLine sends, because the Evolution driver supports media. Restrict to text only if the ban risk looks higher.
- Do we need cap rings, or are «الأرقام» card counters enough? v1 rings once per number per day.

## Review corrections (binding)

1. BLOCKING, cold messages. The spec says the lane never cold-messages because a thread is required. The code says otherwise. pickSend returns no_thread only when thread === null (feat/evolution-driver apps/api/src/modules/messaging/inbox/send/send-number.ts:64). v_threads is built from every message (migrations/20261030000984_calls_number.sql:39-45), so a phone that has only ever received our templates (a new lead, a reminder) has a thread. numberWindows returns nothing for it, replyNumber gives open.length===0 and returns session_closed (packages/shared/src/messaging/replies/reply-number.ts:37), and step 2b then sends free Baileys text to a phone that never wrote. FIX: only call at.lane when thread.last_inbound_at is not null, and treat calls-only history as no inbound (as messagingWindowOpen does, threads.mapper.ts:85-99). Add a text-line.lane test for an outbound-only thread that expects 409 or the hold.
2. BLOCKING, 503 instead of 409/hold, and 'unchanged' callers break. Step 7 removes lane numbers from input.numbers only. numberWindows still keeps every row with a non-null numberId (send-number.ts:36), so the lane's open window reaches replyNumber with canSend=false. The result is number_not_configured, mapped to line_not_configured 503 (send-number.ts:52, reply-number.ts:37). This fires whenever the family's only open window is on the lane: teacher sendLine (text-line.ts:52-57) answers 503 although the spec promises 'teacher unchanged'; thread-reaction.service.ts:48 answers 503; meeting-invite.sender.ts:74 records line_not_configured on the invitee; call-permission.service.ts:78 answers 503; threadReactable becomes false. The same thing happens inside textLine with afterWindow:true: the family wrote to the lane 2 h ago, the lane is now disabled or env-null, so the result is number_not_configured and step 2b (which only runs on session_closed) never runs. Staff get a 503 instead of today's hold. FIX: when afterWindow is false, drop lane windows from rows by numberId as well, so those callers get session_closed. In textLine, treat number_not_configured as session_closed when every open window belongs to an afterWindow number, so 2b and then 2c run. Add tests for all four callers during an active lane session.
3. BLOCKING, the restriction fails lane rows instead of holding them. The spec says restriction leads to toHold through failIfOff. In fact NumbersEvolution.restrict calls this.evolution.failQueued(id) inside the webhook (feat/evolution-driver apps/api/src/modules/messaging/numbers/evolution/numbers-evolution.ts:94-100; evolution-numbers.repo.ts:71-83). Every queued lane row becomes failed/EVOLUTION_NUMBER_OFF before message.job.ts:112 failIfOff ever sees it. numbers.service.ts:91 (remove) does the same. FIX: in restrict() and remove(), when the row has after_window, call LaneFallback.toHold(numberId) instead of failQueued. Add a test: 3 ERRORs on a lane mean queued rows end AWAITING_REPLY on the main number and none fails.
4. BLOCKING, toHold's compare-and-set can hit a row that is mid-send. The predicate in step 8 is status='queued' and number_id=lane and app_send_until is null. A claimed row is still status='queued' with error_code='sending' (sender.repo.ts:101-112). failQueued guards this case (evolution-numbers.repo.ts:79), and toHold does not. With a bulk move (credential pause on all queued lane rows, or restriction), a row being sent by another pass gets AWAITING_REPLY on main with next_attempt_at=null. It is due at once, so WindowHold queues a reopen template on main. The lane send then succeeds and sent() (sender.repo.ts:116-127, compare-and-set on status only) marks it sent while it is stamped as the main number. The result: an extra template to the family, plus a wrong number_id that hides the row from the lane's countErrors and restriction count. FIX: add `.or('error_code.is.null,error_code.neq.sending')` to toHold, exactly as failQueued does.
5. BLOCKING, a moved or released row expires instead of being held. WindowRelease.release keeps expires_at ('its deadline is kept', window.repo.ts:251-263), and heldStep returns 'expire' for any AWAITING_REPLY row with expires_at set (window-rules.ts:80-83). Step 9 releases a held row and moves it to the lane with expires_at still set. If the lane then breaks, toHold writes AWAITING_REPLY with next_attempt_at=null, the row is due at once, and heldStep fails it with HOLD_EXPIRED. Nothing reaches the family. FIX: toHold must leave a state that heldStep reads as 'hold'. Either clear expires_at and set scheduled_for=now (as messages.repo retryFields does on #649: expires_at null, scheduled_for restart), or make heldStep compare expires_at with now. Add a lane-fallback test where the moved row has expires_at set.
6. BLOCKING, PR order regresses held texts between PR 2 and PR 3. Today's release uses thread_summaries.last_chat_inbound_at, which is per line and not per number (window.repo.ts lastChatInbound; window-release.ts:49). Lane inbound is line='chat', so after PR 2 a family reply on the lane releases every row held on the main number for that phone. Each released row is sent from the closed Kapso number, gets Kapso 422 (window-rules.ts:23-34), goes through closed() and is re-held with checkedAt=now (window-reopen.ts:55-59). attempts goes up on each try. The text never reaches the family, because only the next lane inbound releases it, and it fails again. FIX: ship step 9 (releaseVia/move) in PR 2, or block the kill switch until PR 3 merges. Implement lastChatInbound {at, numberId} as one batched read of v_thread_numbers .in('phone_e164', phones) (migrations/20261024000633_numbers_routing.sql:51-62, which has messages_inbound_phone_number_idx). Do not use the per-phone messages query the spec describes: that is up to 2000 reads per pass on the hottest table, and PostgREST cannot do newest-per-phone.
7. Order and double contact across two numbers. Step 2b ignores rows already held or queued on the main number for the same phone, and ignores a live reopen template. Example: text A is held on main (the lane was capped) and its reopen template is sent from main. Text B goes out from the lane at once. The family gets B first from a new number plus a template from main asking them to reply, and A arrives later from main. This is an order inversion and two academy numbers contact the family in the same minute. FIX: in AfterWindowLane.pick, return null when the phone has queued AWAITING_REPLY rows or a live reopen (WindowRepo.reopens liveOnly). Or move those held rows onto the lane in the same compare-and-set and cancel the reopen through ReopenCancel. Note that ReopenCancel.afterAttach keeps the reopen while any other text is pending (reopen-cancel.ts:60-67), so moving several rows needs one cancel per phone after all moves, not one afterAttach per row.
8. The kill switch is incomplete. textLine passes afterWindow:true to pickSend without checking the after_window_line setting. A family that wrote to the lane in the last 24 h therefore keeps getting staff texts from the lane after the owner turns the setting off (step 6, 'sticky'). The spec's own e2e case (3) runs right after case (2)'s lane reply, so it would pick the lane and not the hold. FIX: pass afterWindow only when the lane setting is on (expose AfterWindowLane.enabled()), and use the 409/session_closed fix from the 503 objection above for lane windows when it is off.
9. The sticky path skips every lane guard. After a lane reply, replyNumber picks the lane through sendable() only (enabled && env, send-number.ts:42). daily_cap, first_contact_cap and evolution_state are never checked. The claim-time cap (8c) then moves the text to main with AWAITING_REPLY, so a family who replied on the lane minutes ago gets the reopen template from main. FIX: when pickSend returns an afterWindow number, run laneReady (state and daily cap) as well. If that fails, either document that in-window lane replies are exempt from the cap, or fall back to the next lane number before the hold.
10. laneOn reaches only one of five toThreadView callers. thread-delta.service.ts:96 calls toThreadView(row, now) without options, so the open chat's periodic delta refresh turns session_open back to false. sales-threads.service.ts:40,56 has the same problem: sales send through textLine, so they use the lane, yet their composer shows the chat as closed. teacher-threads.service.ts:42,53 must stay false. Side effects of session_open=true with an inbound from days ago: ComposerPhone.tsx:67-68 shows 'النافذة مفتوحة حتى <a time in the past>' (format.ts:126 sessionUntil). When the composer opens closed (for example sales without laneOn), use-thread-reopen.ts:31 queues a reopen template on main and the next text then goes from the lane, so the family hears from both numbers. FIX: compute laneOn in one shared helper and pass it from threads, sales and delta (teacher passes false). Hide the sessionUntil note when the chat window is closed and the composer is open only because of the lane. Add tests for the delta and sales views.
11. The lane leaks to staff through error text. A lane row that ends in evolution_error or evolution_number_off shows «…يوقف رقم Evolution تلقائيًا» or «رقم Evolution موقوف أو محذوف … أعد إرسالها من رقم آخر» (packages/shared/i18n/ar.json:3796-3797). evolution_error comes from the MESSAGES_UPDATE ERROR path (webhook.evolution.ts:58-63 via EvolutionRestriction). reaction_unsupported (reaction-line.ts:26-28) also names the line on lane chats. FIX: lane rows never keep evolution_* codes (toHold, see the restriction objection above). For after_window numbers, map the ERROR status to a neutral code such as send_failed. Add a test that a lane row's error view contains no Evolution or number wording.
12. Admin edits break the new check and return 500. numberPatch (numbers.patch.ts:29-39) clears is_default on a purpose change but never touches after_window, and the update schema is .partial() (packages/shared/src/messaging/numbers/schemas.ts:41-55), so a zod refine cannot see the stored row. Each of these violates wa_numbers_after_window_check: PATCH {purpose:'notifications'}, PATCH {provider:'kapso'}, PATCH {evolution_mode:'cloud'}, the BehaviourSection auto_sends toggle (evolution_auto_sends:true), and the wa_number_make_default RPC. They come back as raw 23514/500, not the 409 the spec promises. FIX: in numbers.service.update, validate {...before, ...rest} against the lane rule (as assertKapsoCalls already does), return 409 after_window_conflict, and add the code to NUMBER_ERRORS and i18n. Also enforce in the evolution config save (NumbersEvolution.saveConfig, numbers-evolution.ts:62-71), not only in the form.
13. evolution_state as the gate goes stale. restrict() writes 'refused' (evolution-numbers.repo.ts:57-68). An admin re-enable does not change it, and only a CONNECTION_UPDATE webhook does (evolution-webhook.service.ts:47-49). So after owner step 9 the lane stays inactive with no signal. The admin may also deselect CONNECTION_UPDATE or MESSAGES_UPSERT, because the events list accepts any subset of 1 or more (packages/shared/src/messaging/numbers/evolution-config.ts:76). Without MESSAGES_UPSERT, family replies on the lane never arrive. FIX: the lane refine requires webhook.enabled plus CONNECTION_UPDATE, MESSAGES_UPSERT and MESSAGES_UPDATE. When a lane is enabled, run the existing instance check (lines.check.evolution.ts) and write evolution_state. The 'number is not connected' signal on the card should cover the 'refused' state as well.
14. Family replies can be lost on @lid. digitsOf drops a @lid message that has no remoteJidAlt (webhook.evolution-message.ts:52-54, 114-118), and nothing is logged. On a new Baileys number this is a common inbound shape. The family's reply on the lane then never reaches the thread, no window opens, and step 9 never moves anything. The spec depends on step 5. FIX: resolve the LID through the Evolution contact/lid lookup (or our own sent key.remoteJid for that chat). At minimum, log and count the dropped messages and ring the admin bell. Add an e2e/unit case with a @lid upsert.
15. Fallback on Meta/CRM main lines changes behaviour. Step 2b puts the lane before the chatOnKapso gate, so on a Meta or CRM main line toHold (8a/8b/8c) creates AWAITING_REPLY rows on a line that today answers 409 (text-line.ts:71). These rows have try_after_window only for Kapso (threads.mapper.ts tryAfterWindow), and reopen.ensure can fail them with REOPEN_UNAVAILABLE. With laneOn the composer also shows open on Meta, so a capped lane gives staff an unexpected 409 instead of the templates-only composer. FIX: on non-Kapso main lines, the fallback fails visibly with a neutral code and laneOn requires a ready lane. Otherwise, restrict v1 to chatOnKapso().
