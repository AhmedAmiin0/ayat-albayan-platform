# 43 — Client shared state, on-phone message store, request audit

Owner 2026-11-06: «the chat sometimes gets the update but when i open the list i still see the message as
pending»; «you need to have a good manage of the shared global app state»; «use in the phone db to store the
messages so we can optimize the apis»; «no duplicate requests? or rerenders or unaborted requests?».
Design only. Read-only research on origin/develop de76c4ee; every finding checked by a second agent (one
claim refuted and dropped). Ordered plan: docs/44.

## 1. What we measured

| Fact | Value / where |
|---|---|
| Server consistency | `thread_summaries.last_status` = last message status for all 1,322 chats; statement triggers on `messages` broadcast `thread_changed {phone}` on every insert/update (`20261028000860_inbox_realtime.sql`) |
| Live re-read throttles | chat 1 s, list 3 s (`packages/client-core/src/messaging/inbox/inbox-live.ts:17,19`); fallback poll 20 s while live (`:15`) |
| Mobile persistence | whole TanStack cache in ONE AsyncStorage key `ab-query-cache`, default 1 s throttle, maxAge 1 day, buster = app version (`apps/mobile/src/core/lib/query/query-client.ts:56-65`) |
| Copies of one message | thread pages, anchored window, search hits, a list row per filter, the provisional row: up to 5 |
| React Compiler | on in both apps (`apps/mobile/app.json:90`, `apps/web/vite.config.ts:14`) |

## 2. The pending tick in the list (owner bug) — exact path

1. Send: `touchInbox` writes the provisional row with `status: 'queued'` into every cached list
   (`apps/mobile/src/inbox/thread/hooks/inbox-sync.ts:62-65`, `thread-list-cache.ts:24`).
2. `onSettled` → `refreshInbox` refetches the list at once (`use-thread.ts:97` → `inbox-sync.ts:21,33`): the
   list stays mounted under the chat, so it is still "active". The server still says `queued`.
3. The status moves to `sent`; the event only marks the hidden list dirty (`live-registry.ts:33-36`).
4. Back on the list, `watch()` fires the dirty refetch (`live-store.ts:60-62`) with `cancelRefetch:false`
   (`apps/mobile/src/inbox/thread/live/use-inbox-realtime.ts:18`; web `inbox/api/live.ts:51`): it **joins** a
   read still in flight that started before the status change, and that stale `queued` answer wins.
5. Nothing copies the statuses the chat already merged into the list cache. With realtime quietly dead (still
   SUBSCRIBED) nothing marks it dirty and returning to the list re-reads nothing: the 20 s poll is the only cure.

## 3. Audit (confirmed findings)

| ID | Type | file:line | Effect | Fix (PR) |
|---|---|---|---|---|
| AU1 | stale | mobile `use-inbox-realtime.ts:18`; web `live.ts:51` | event-driven list refetch joins an older in-flight read → pending tick | `cancelRefetch:true` for event runs; 3 s throttle still caps it (43-1) |
| AU2 | duplicate | `inbox-sync.ts:21,33,68-71` | hidden list re-read on every send and every opened chat | `refetchType:'none'` + mark dirty (43-1) |
| AU3 | duplicate | `query-client.ts:38-41` + `inbox-sync.ts:52-55` + `use-inbox-realtime.ts:37` | foreground: focus refetch, `resumeInbox` (cancels them, then invalidates all `['threads']`) and the realtime resync all fire; focus reads are wasted | one resume path (43-3) |
| AU4 | duplicate | `inbox-sync.ts:41-44`; `use-thread.ts:32-40` (no `maxPages`) | every send re-reads every loaded page one by one (slower the further she scrolled) | refresh the newest page only (`mergeNewest`) (docs/44 P0-3) |
| AU5 | duplicate | `thread-poll.ts:51,64`; `use-inbox-realtime.ts:14` | while live: delta 20 s + page poll 60 s + a full newest page per event | event → delta; one fallback (43-3) |
| AU6 | duplicate | `live-registry.ts:34`; web `use-sales-unread.ts:24` | badge re-read on every event (incl. outbound ticks); web sales adds an interval | badge only on inbound/read events; drop the sales interval while live (43-3) |
| AU7 | duplicate | `packages/client-core/src/messaging/message-search/message-search.ts:12-13` | search hits re-run on every `['threads']` invalidate | docs/41 41-4 |
| AU8 | unaborted | mobile `thread-poll.ts:42,56`, `use-anchored-thread.ts`, `use-inbox-badge.ts:14`, `use-paged-list.ts:28`; client-core `thread-pages.ts:32,58` (`ThreadGet` takes a path only); web `inbox/api/api.ts:41,51,65`, `use-nav-counts.ts:14`, `thread-delta.ts:29` (search: docs/41 41-2) | queryFns ignore TanStack's `signal` (mobile `useThread`/`useThreadList` do pass it) | pass `signal` (43-2) |
| AU9 | unaborted | web `apps/web/src/lib/http/api.ts:9-16` | web reads have no timeout at all (mobile GET has 20 s, `read-deadline.ts:6,26-31`) | move `withReadDeadline` to client-core (43-2) |
| AU10 | unaborted | `packages/client-core/src/core/http/api-client.ts:38-45`; `read-within.ts:14` | `apiSend` has no signal and no timeout: a hung POST keeps `isMutating` > 0, `busy()` drops every poll answer (`thread-poll.ts:14-15`) and the composer refuses to send (`use-composer-send.ts:61`) | 30 s deadline; retry is safe (server dedups `clientRequestId`, `thread-send.service.ts:44-46`) (43-2) |
| AU11 | perf | `query-client.ts:56-59` | full-cache stringify up to once a second on any cache event; multi-MB blob (Android AsyncStorage row limits: unverified on device) | `throttleTime` 5 s now; thread pages `noPersist` after 43-7 |
| AU12 | stale | page poll `thread-poll.ts:56-59` has no `dataUpdatedAt` guard (delta has, `:41,44`) | an older answer can set ✓✓ back to ✓ for a moment | merge statuses by rank (43-1) |

Re-renders: none harmful found. Structural sharing keeps unchanged polls referentially equal; poll results
are not read by components (`thread-poll.ts:36,53`); FlashList keys by phone. Hand-written `useMemo` under the
compiler (`use-thread-list.ts:50,64`, `ChatActionsProvider.tsx:56-72`, `MessageList.tsx:66`) is a rule-3 lint
item, not a render cost: remove when those files are next touched.

## 4. Plan A — fix today's TanStack state (OTA + web, no APK)

| # | PR title | Files | Tests | Expected gain |
|---|---|---|---|---|
| 43-1 | fix(inbox): list never shows a stale tick | shared `laterStatus` for the SAME message id, ranking only queued < sent < delivered < read (`RANK` in `webhook.status.ts:8` has no `failed`/`sent_manually`, and the server legitimately moves failed/held → queued and failed → sent_manually: `reopen-cancel.repo.ts:68`, `send-plan.ts:84`, `manual-echo.repo.ts:12`), so `failed`, `sent_manually` and any full HTTP read of the row always replace the cached status; list `select` overlays `last_status` from the chat cache row with the same `last_message_id` when it ranks higher; AU1, AU2, AU12; on list focus refetch if older than the last event | `laterStatus` (≥80 %), `live-store`, `use-thread-list.live` | list tick = chat tick within ≤1 s (today up to 20 s); −1–2 `GET /threads` per send |
| 43-2 | fix(client): every request abortable and bounded | AU8–AU10: `ThreadGet(path, init)`, `apiSend` 30 s, web read deadline from client-core; in the SAME PR a send that ends without an answer (deadline, network) keeps its bubble as «unconfirmed» and re-reads before saying it failed (docs/44 BUG7), so the deadline never causes a double send | `api-client`, `thread-poll` | no frozen chat after a dead network; send cost flat |
| 43-3 | perf(inbox): one refresher per cause | AU3, AU5, AU6; persister `throttleTime` 5 s (AU11) | `inbox-sync`, `app-resume` | open chat ~240 → ~180 req/h; ≥2 fewer reads per foreground |

Files near the cap: web `inbox/api/api.ts` **150**, `TextComposer.tsx` 149, mobile `use-thread.ts` 118,
`thread-cache.ts` 117: new code in new files. Baselines (keep or shrink): mobile `thread-poll.ts`
`no-parent-imports 1, no-untyped-api-calls 2, complexity 1, max-len 10`; `use-thread-list.ts`
`no-parent-imports 1, no-untyped-api-calls 1, complexity 1, max-len 6, no-restricted-syntax 1`;
`use-inbox-realtime.ts` `unbound-method 1, no-parent-imports 1, max-len 7`; `inbox-sync.ts` `max-len 3`;
`thread-list-cache.ts` `max-len 4`; client-core `live-connect.ts` `max-len 5`; web `live.ts`
`unbound-method 3, max-len 1`.

## 5. Plan B — on-phone SQLite store (one row per message)

| Piece | Design |
|---|---|
| Native | `expo-sqlite` is not installed (`apps/mobile/package.json`); `runtimeVersion` policy is `appVersion` (`app.json:92-93`) → **new APK 0.5.0**; OTA no longer reaches 0.4.x for these screens |
| Server cursor | `messages` has no `updated_at`. Migration `20261106000850_messages_sync_cursor.sql`: `updated_at timestamptz not null default now()`, BEFORE UPDATE row trigger, index `(updated_at, id)` (load `supabase-postgres-best-practices`) |
| Endpoint | `GET /threads/sync?since=&limit=` → `{ messages, threads, gone: ids, cursor, has_more }`, zod schemas in `packages/shared`. Same scope as thread reads: teacher `assertPhone` (`thread-delta.service.ts:60`), sales `visibleToSales` + link templates hidden, own numbers hidden. Rows that become hidden come back as `gone` tombstones. Lives in `inbox/delta/` (`inbox/` already has 12 sub-folders). Re-asks from `cursor − 10 s` (out-of-order commits), upsert by id: idempotent |
| Phone tables | `messages(id pk, phone, created_at, updated_at, status, direction, body, json)` index `(phone, created_at desc, id)`; `threads(phone pk, last_message_id, last_at, unread, json)`; `sync_state(cursor)`; `PRAGMA user_version` |
| Readers | chat, list row tick, anchored window read the same rows (change listener + `useSyncExternalStore`): one source, so the pending-tick class of bug cannot exist. Server-filtered lists (unread, stage, «القوائم», search) stay on HTTP with the 43-1 overlay |
| Triggers | realtime nudge / push / resume → sync (throttled 1 s); fallback sync 30 s |
| Web | keeps TanStack (IndexedDB optional later), may use the same sync endpoint |

| # | PR title | Ship | Tests | Expected gain |
|---|---|---|---|---|
| 43-4 | feat(db): messages sync cursor | migration + API deploy | migration test, RLS unchanged | — |
| 43-5 | feat(api): `GET /threads/sync` | API | http + scope test per role (admin, sales link templates, teacher phones, tombstones) | — |
| 43-6 | feat(mobile): SQLite store + sync engine (pure merge/cursor/tombstone logic in client-core, ≥80 %) | **APK 0.5.0** | jest-expo + client-core unit | — |
| 43-7 | feat(mobile): screens read SQLite; thread pages `noPersist` | OTA on 0.5.0 | screen tests | chat opens from disk (~0 ms); idle traffic ~120 tiny syncs/h instead of page reads; blob shrinks by MBs |

### 43-6 as built (APK 0.5.0)

- `expo.version` **0.4.0 → 0.5.0** (`expo-sqlite` ~57.0.4 via `expo install`). `runtimeVersion` follows the
  app version, so an OTA built from this code never reaches a 0.4.x APK: install APK 0.5.0 first.
- Pure logic in `packages/client-core/src/messaging/thread-sync/` (`planSync`, cursor, `mergeRead`, wire parse).
- The store and engine: `apps/mobile/src/inbox/thread/store/` (tables as above; `sync_state.owner` = the
  signed-in user id, wiped when another user opens it; writes for an old owner are dropped). Not started in
  the app until 43-7.

## 6. Rejected ideas and risks

| Idea / risk | Decision |
|---|---|
| SQLite before fixing Plan A | rejected: Plan A fixes the owner's bug by OTA today; SQLite needs an APK roll-out |
| Persist everything in SQLite incl. server-filtered lists | rejected: filters live on the server; caching them locally duplicates server logic |
| Risk: tombstones missed → a hidden row stays on a phone | sync returns `gone` for rows hidden since the cursor; full resync on `user_version` bump |
| Risk: role change (sales → none) keeps local rows | wipe the DB on sign-out and on a role change |
