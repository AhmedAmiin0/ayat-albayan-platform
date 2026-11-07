# 44 — Chat smoothness: one ordered plan

Owner 2026-11-06: «make sure to check the docs of kapso and make the chatting experience as smooth as possible
because it's slow and buggy»; «dont make the family see typing but let me see it and let me see last seen».
This is the headline doc. It orders the plans of docs/41 (search), 42 (send + server reads), 43 (client state +
SQLite) together with the bug hunt, Kapso parity, «آخر نشاط» and staff typing below. Every finding was checked by
a second agent that tried to refute it; refuted claims are dropped. Design only: no code in this PR.

## 1. Bug hunt — chat bugs current code can still produce (confirmed)

| ID | What the user sees | Repro | Root cause | Platform | How often |
|---|---|---|---|---|---|
| BUG1 | List shows the clock (pending) after the chat already shows ✓/✓✓ | send, wait for ✓ in the chat, go back to the list | docs/43 §2 (stale joined read; chat statuses never copied to the list) | mobile (web joins too: `live.ts:51`) | daily |
| BUG2 | Send stuck, chat frozen (no new bubbles or ticks) | background the app on mobile data, come back, send at once on a dead connection | `apiSend` has no deadline; a pending send makes `busy()` drop every poll (docs/43 AU10) | mobile | weekly |
| BUG3 | Every send is slow, slower the further she scrolled up | scroll up 5 pages, send | every loaded page is re-read after a send (AU4); web also awaits a full `['threads']` reload before anything shows and has no optimistic bubble (`TextComposer.tsx:62-68`) | both | daily |
| BUG4 | Unread badge wrong or late | realtime quietly dead; messages arrive | mobile badge has no interval (`use-inbox-badge.ts:11-17`; the comment at `inbox-live.ts:10-15` says it has); badge counts `thread_summaries`, list reads `v_threads` (two sources) | both | weekly |
| BUG5 | Web chat up to 60 s late | laptop sleep / Wi-Fi switch with the tab open | web delta stops entirely while "live" (`inbox/api/thread-delta.ts:42`); only the 60 s full read is left | web | weekly |
| BUG6 | Notifications (reminders, report ready) reach families 15–30 s late | any on-the-hour reminder batch | jobs never kick the sender; one row at a time across lines (docs/42 R1, R2) | families | daily |
| BUG7 | Failed bubble disappears; text back in the box | connection drops after the server took the POST | `onError` removes the provisional row (`use-thread.ts:96`); a re-send of the SAME text reuses the id (safe), an EDITED text gets a new id → a second message to the family | mobile | weekly |
| BUG8 | ✓✓ falls back to ✓ for a moment | two status events within 1 s | page poll has no ordering guard (AU12) | mobile | rare |
| BUG9 | List preview/tick shows a different row than the chat's last bubble | two rows of one phone with the same `created_at` | current `v_threads` (`20261030000984_calls_number.sql:39-46`) picks `distinct on … order by created_at desc` with no `id` tiebreak; migration 921 had fixed this on `thread_summaries`, 930 undid it (974, 984 kept it) | both | rare |
| BUG10 | Stale tick on the row at a page boundary | a row of the newest page is hidden on the server | `threadMessages` keeps the older page's copy; `mergeNewest` updates `pages[0]` only (`thread-cache.ts:21-29,60-71`) | mobile | rare |

Repeat-fix chains seen in git (root cause still open): chat liveness ef719398 → 4a2b190b → 8d51ac3c → 02403bf3
(each shortens a timer; none makes the list/badge follow the chat or bounds writes; web delta left out).

## 2. Kapso parity (docs.kapso.ai, project webhook config, read-only)

| Kapso | Us | Plan |
|---|---|---|
| Webhook → server ~1 s, buffering off, first attempt | same (Kapso → API is not our slowness) | — |
| WebSocket pushes the data (new message, status, conversation update) | pushes `{phone}` only (`20261028000860_inbox_realtime.sql:31-34`); every client re-reads over HTTP (two hops, throttled 1 s / 3 s) | **K1** status in the push |
| Green/red live dot, reconnect with backoff | no indicator; non-SUBSCRIBED only sets `live=false` (`live-connect.ts:46-50`); rejoin on resume only | **K2** |
| Failed bubble stays with retry | mobile removes it, web never showed one | **K3** |
| List from a summary table | list re-aggregates all of `messages` (`v_threads`, 984); 30 biggest phones took 430 ms (docs/37) | **K4** |

**K1 payload** (built: migration `20261107000300_inbox_live_rows.sql`): the statement trigger aggregates per phone
`{phone, rows:[{id, s:status, d:direction, at:created_at}]}`, ≤20 rows, else `{phone}` only. No body, no names, no
params. Rows that NOT every `inbox:staff` reader may see are sent as `{phone}` only (no id): link templates
(`template_key` in `LINK_TEMPLATES`, hidden from sales — `sales-threads.ts:5-9`), staff-hidden rows (`hidden_at`),
reaction/marker rows (`message_is_reaction`), edits/deletes (need a body re-read), and rows of the academy's own numbers (`wa_numbers` display phones: every read hides them, `thread-reads.ts:101-103`, but the trigger does not filter them, 860:58-60). A SQL list twin of
`LINK_TEMPLATES` gets a unit test that keeps it equal to the TS list. Teachers never join `inbox:staff`
(`inbox_live_reader`, 860; `routing.teacher.test.tsx:125`). Client: pure `applyLiveRows` inside `thread-delta.ts`
(`client-core/src/messaging/inbox` already has 12 code files) patches known ids by `laterStatus` (docs/43 43-1:
queued < sent < delivered < read only; `failed`/`sent_manually` always replace) in the chat AND the list row,
and ignores phones not in a loaded list; unknown ids still trigger the
throttled HTTP read for the body. Supabase's broadcast payload limit must be checked for our plan before merge.

## 3. «آخر نشاط» (last seen) — what is possible

WhatsApp Cloud API gives NO customer last seen, online state or typing (no webhook carries them). What we do know:

| Signal | Stored |
|---|---|
| last inbound message | `thread_summaries.last_inbound_at` (921:34), exposed as `ThreadView.last_inbound_at` (`packages/shared/src/messaging/chat/views.ts:25`) |
| they read one of our messages | `messages.read_at` on OUTBOUND rows, from the status=read webhook timestamp (`webhook.status.ts:44`) and manual echoes (`manual-echo.ts:66`). On inbound rows `read_at` means staff read it: never use those |

Design (migration `20261106000800_thread_summaries_activity.sql`, with K4): add `thread_summaries.last_family_read_at`
(max outbound `read_at`) and `last_activity_at = greatest(last_inbound_at, last_family_read_at)` in
`thread_summary_refresh` (latest body 992:134); make the refresh also fire when only `read_at` changes; backfill;
rebuild `v_threads` on `thread_summaries` with the `(created_at desc, id desc)` tiebreak, keeping every column and
rule of 930/974/984 (reactions excluded, guardian_phones join, calls number), new columns at the end. Display
replaces today's «آخر رسالة {when}» (`ar.json:8115`, `presence-line.ts`, web `LastMessageLine.tsx`, mobile
`use-last-message.ts`): header «آخر نشاط في المحادثة {when}», list «آخر نشاط {when}», with a hint «وقت آخر رسالة
منه أو آخر قراءة لرسائلنا، وليس آخر ظهور في واتساب». Shown only to those who can open the chat today.

## 4. Typing — what is possible

| Ask | Answer |
|---|---|
| Show the family's typing | **Impossible**: Meta does not send customer typing. Not built. |
| Never show typing to families | `markRead` sends only `{messaging_product, status:'read', message_id}` (`wa-components.ts:87-91`); `typing_indicator` appears nowhere. **One gap**: the Evolution driver's per-number send `delay` (0–2000 ms, default 0, editable in `SendingSection.tsx`) is labelled in the code and `ar.json:6966-6967` as showing «يكتب…» to the recipient (`evolution-body.ts:75-79`). Pin it to 0 and remove the field (row P0-6). Related: `always_online` (`evolution-push-bodies.ts:16`) can show the family «online» (not typing); P0-6 turns it off too. |
| Staff typing («let me see it») | Supabase Realtime Presence on a new private topic `inbox:typing` (migration `20261106000830_inbox_typing.sql`: select + insert policies for `extension='presence'` only, `inbox_live_reader()` rule AND `(select realtime.topic()) = 'inbox:typing'` in both — policies are OR'ed, so without the topic check staff could track on any `presence:<id>` topic and bypass `presence_track` (985:91-96); pattern of `20261030000985_presence.sql:84-96`; `inbox:staff` stays broadcast-only, select-only). `track({phone, at})`, presence key = profile id; at most every 3 s while typing, untrack after 5 s idle / on send / on leaving; viewers drop entries older than 6 s. Shows «{name} يكتب الآن…» above the composer only for another staff member in the same chat. Hooks: a new `use-staff-typing.ts` called from web `TextComposer.tsx:126` (149 lines) and mobile `ComposerInput.tsx:55`. Nothing goes to Meta, Kapso or Evolution. Teachers neither send nor see it. |

## 5. The ordered plan

Effort: XS < ½ day, S ≈ 1 day, M ≈ 2–3 days, L ≈ a week. Ship: OTA = JS only; web/API = deploy; APK = new binary.

| # | PR title | User-visible effect | Ship | Effort | Expected gain |
|---|---|---|---|---|---|
| **P0-1** | fix(inbox): list never shows a stale tick (43-1) | BUG1, BUG8 gone; ticks never go backwards | OTA + web | S | list = chat tick within ≤1 s (today up to 20 s); −1–2 `GET /threads` per send |
| **P0-2** | fix(client): every request abortable and bounded + «unconfirmed» bubble (43-2, BUG7) | BUG2, BUG7 gone: a dead network never freezes the chat or loses / doubles a send | OTA + web | S | no hung sends; superseded reads freed |
| **P0-3** | perf(chat): a send refreshes only the newest page; web optimistic bubble (docs/43 AU4, 42-11, K3 web part) | BUG3: sending feels instant on web and mobile | OTA + web | M | −15 reads per send; no page re-read chain |
| **P0-4** | perf(db): `v_threads` on `thread_summaries` + last activity columns (K4, §3 migration 000800) | BUG4 (one source), BUG9 gone; faster list | API (migration) | M | list read for big phones 430 ms → few ms; data for «آخر نشاط» |
| **P0-5** | fix(worker): kick the sender when jobs queue rows (42-1) | BUG6: reminders arrive in seconds | API | S | notifications p50 14.65 s → ~2–3 s |
| **P0-6** | chore(evolution): no typing delay, no always-online to families | owner rule enforced | API + web | XS | — |
| P1-1 | fix(inbox): badge follows the chat; web delta while live; live dot + rejoin with backoff (BUG4, BUG5, K2) | badge right; web never 60 s late; green/red dot | OTA + web | M | late updates ≤20 s → ≤1 s when live |
| P1-2 | feat(inbox): status in the realtime push (K1, migration 000810) | ticks move with zero requests, like Kapso | OTA + web + migration | M | ~0 HTTP per status change (today 1 chat + 1 list + 1 badge read per client) |
| P1-3 | perf(api): in-chat search in one SQL call (41-1, migration 000820) | in-chat search fast on big chats | API | S | 3 reads / ~2,066 rows → 1 call / hits only |
| P1-4 | feat(search): abort, keep hits, current hit, marked names (41-2, 41-3, 41-5, 41-6; 41-4 after owner OK) | WhatsApp-style marks; no flicker | OTA + web | M | no blank flash; H1, H2 closed |
| P1-5 | perf(worker): templates cache, parallel pass reads, no enqueue re-reads, keep-alive, timing log (42-2…42-6) | chat sends faster | API | M | chat p50 2.04 s → ~1.6–1.8 s (the 1.6 s provider call stays); message_templates 129/h → ~15/h |
| P1-6 | feat(inbox): «آخر نشاط» in header and list (§3) | honest last activity | OTA + web | S | — |
| P1-7 | feat(inbox): staff typing (§4, migration 000830) | two staff never answer one family at once | OTA + web | M | — |
| P1-8 | perf(inbox): one refresher per cause (43-3) | fewer spinners on resume | OTA + web | S | open chat ~240 → ~180 req/h |
| P2-1 | perf(worker): per-line drain + chat ticker (42-7), kick 202 (42-8) | chat never waits behind reminders | API | M | burst time ÷N (N after owner OK) |
| P2-2 | chore: idle probe RPC (42-10, migration 000840); integration refresh 10 min (42-9, needs `REDIS_URL` or owner sign-off) | none | env / API | S | −~500 PostgREST reads/h |
| P2-3 | fix(mobile): page-boundary dedup (BUG10) | no stale tick at a page edge | OTA | XS | — |
| P3-1 | feat: SQLite store (43-4…43-7, migration 000850) | chats open instantly offline; one source of truth | migration + API + **APK 0.5.0** + OTA | L | chat open ~0 ms from disk; idle traffic → small syncs |

Migrations, numbered in ship order (`db-migrate.yml` refuses an older file after a newer one): 000800 (summaries +
activity + `v_threads`), 000810 (live rows), 000820 (in-chat search), 000830 (typing policies), 000840 (sender
probe), 000850 (sync cursor) — all after 20261106000700. If the ship order changes, renumber before merging. Every builder:
≤150 lines per file, ≤3 params, tests next to code, ESLint suppression counts only shrink (exact baselines in
docs/41 §4, 42 §4, 43 §4), RLS + Nest guards, Arabic strings in MSA in `packages/shared/i18n/ar.json`.

## 6. Risks

| Risk | Guard |
|---|---|
| K1 leaks a hidden row's existence to sales | link-template, hidden and marker rows go out as `{phone}` only; SQL/TS list parity test |
| K4 drops a column rule added by 930/974/984 | migration test compares the old and new `v_threads` for every column on seeded data |
| Staff typing reaches a family | Presence lives only in Supabase on `inbox:typing`; no provider code is touched; RLS refuses non-staff |
| Parallel drain lets more rows pass an OFF switch | gate still read uncached before every row; concurrency 1 until owner OK (docs/42 §3) |
