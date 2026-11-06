# 41 — Chat search: speed and WhatsApp-style highlight

Owner 2026-11-06: «make the search in the chat faster and highlight it like wa use some optimization ways like
redis, indexes, fulltextsearch in pg». Design only (no code in this PR). Read-only research on origin/develop
de76c4ee, every finding checked by a second agent that tried to refute it. Ordered plan: docs/44.

## 1. What we measured (production, read-only, counts only)

| Item | Value |
|---|---|
| messages / chats / biggest chat | 20,710 / 1,322 / 2,064 rows |
| Global search `search_messages` (4-letter Arabic word, all chats, limit 31) | 173 ms cold, 24 ms warm; trigram bitmap scan 2 ms; generic plan 9 ms |
| Trigram index `messages_search_trgm_idx` | 3.8 MB (fits in RAM) |
| In-chat search `GET /threads/:phone/search`, 2,064-row chat | 3 sequential PostgREST reads, ~2,066 rows × 7 columns sent to Node, then folded and matched in Node |

The database is not the bottleneck. In-chat search is: it ships the whole chat to Node on every call.

## 2. Root causes (confirmed)

| ID | Cause | Where |
|---|---|---|
| S1 | In-chat search reads the whole chat in keyset batches of 1,000 (`SCAN_BATCH`, cap `SCAN_MAX` 20k) over PostgREST and matches in Node | `apps/api/src/modules/messaging/inbox/reads/search/chat-search.repo.ts:18-24,39-67` |
| S2 | `total: hits.length` needs every row, and every cursor page («أقدم») re-runs the full scan | `apps/api/.../reads/search/chat-search.ts:52-62`; `chat-search.service.ts:28-30` |
| S3 | Search queryFns drop TanStack's `signal`: each settled keystroke's request runs to the end | `packages/client-core/src/messaging/chat-search/search-query.ts:16,34`; `packages/client-core/src/messaging/message-search/message-search.ts:39-40` |
| S4 | Global hits key `['threads','message-search',q]` sits under `['threads']` (on purpose, comment at `message-search.ts:12-13`), so every send / push / resume re-runs every loaded hit page | same file `:12-13`; e.g. web `TextComposer.tsx:68` |
| S5 | No placeholder data: earlier hits vanish while typing («جارٍ البحث…» flash) | web `use-search-results.ts:14-16`; mobile `chat-search-api.ts:19` |

Debounce is fine (300 ms everywhere, `packages/client-core/.../chat-search.ts:7`): at most one request per
settled query. Min length: in-chat 1 character (`packages/shared/src/messaging/message-actions/chat-search.ts:27`),
global 3 (trigram cannot use the index below 3).

## 3. Highlight vs WhatsApp

| WhatsApp does | We do | Gap |
|---|---|---|
| Marks every match in bubbles | `SearchMarks` (bold + gold underline), web and mobile, fold-aware: `highlightParts` maps folded matches back to the original text (tashkeel, alef forms kept) — `packages/shared/src/messaging/replies/saved-reply-text.ts:66-95` | none |
| Current hit stronger than the others | all hits look the same; the current one only flashes (`data-flash`) | **H1** |
| Chat name marked in list rows and result rows | plain name: web `ThreadRow.tsx:60`, mobile `ThreadRow.tsx:33-41`, both `MessageHitRow` name cells (web `:39`, mobile `:34`) | **H2** |
| Snippet cut around the match, match marked | API cuts 40 chars each side (`search-snippet.ts:23-24`, `SNIPPET_SIDE`), rows mark it (web `MessageHitRow.tsx:44`) | none |
| «N من M», up/down | exists in-chat (`search-status.ts:31-34`); global has no total by design (docs/37) | none |

Note: `core/ui/primitives/Mark*` (mobile) and `components/ui/display/mark.tsx` (web) are the logo emblem,
not text highlight; do not reuse them for marks.

## 4. Plan (small PRs, each shippable alone)

| # | PR title | Files | Ship | Migration | Tests | Expected gain |
|---|---|---|---|---|---|---|
| 41-1 | perf(api): in-chat search in one SQL call | new `20261106000820_chat_search.sql`: `search_chat_messages(p_phone text, p_q text, p_skip_templates text[])` returns the matching rows of ONE phone (`m.phone_e164 = p_phone`, no `is null or` so `messages_phone_idx` / trigram both apply), keeping today's filters `deleted_at is null`, `hidden_at is null`, `not message_is_reaction(...)` (`chat-search.repo.ts:58-63`), same light columns, capped at `SCAN_MAX`; `chat-search.repo.ts` (68 lines) calls it once; `chat-search.ts` keeps the Node re-check (`looksCrmHistory`), total, paging and snippet unchanged | API | yes (load `supabase-postgres-best-practices`; `security invoker`, execute to `service_role` only, like 000400) | repo test (one rpc call, args), migration test like `message-search.migration.test.ts`, SQL parity e2e `message-search.sql.spec.ts` extended, existing `chat-search.http.test.ts` unchanged | 3 round trips / ~2,066 rows → **1 / only the hits**; est. 80–150 ms → 10–25 ms per call; older pages stop re-reading the chat |
| 41-2 | fix(client): abort superseded searches | `search-query.ts` (57), `message-search.ts`: `({ pageParam, signal }) => get(path, { signal })`; `SearchGet` type gains `init` | OTA + web | no | client-core unit: signal forwarded (the only PR that fixes the search part of docs/43 AU8) | stale requests freed at once; no late answer overwrites a newer one |
| 41-3 | perf(client): keep hits while typing | web `use-search-results.ts`, mobile `chat-search-api.ts` / `use-message-hits.ts`: `placeholderData: keepPreviousData` | OTA + web | no | hook tests | no blank flash between keystrokes |
| 41-4 | perf(client): global hits out of `['threads']` | key → `['message-search', q]`; owner to confirm (reverses a deliberate choice: hits then refresh on their 30 s staleTime, not on every send) | OTA + web | no | key test | −1…N hit-page reads per send / push / resume |
| 41-5 | feat(search): current hit stronger | `SearchMarks` gets a `current` flag (thicker underline + ink, no box); web `SearchableBody.tsx`, mobile `LinkedText.tsx` (94). `MessageBubble.tsx` is at **150**: pass the flag through an existing prop, do not grow it | OTA + web | no | marks tests (current vs other) | H1 closed |
| 41-6 | feat(search): mark the chat name | web `ThreadRow.tsx` (101), mobile `ThreadRow.tsx` / `row/ChatRow.tsx` (100), both `MessageHitRow` names: `highlightParts(name, q)` | OTA + web | no | row tests incl. Arabic fold (أحمد / احمد) | H2 closed |

ESLint baselines touched: web `ThreadRow.tsx` holds `complexity 1, max-len 2`; mobile `ThreadRow.tsx`
`no-restricted-syntax 2`. These PRs must not raise them; if one drops, prune with `pnpm lint:prune` in a cloud
session and commit the `eslint-suppressions.json` diff.

## 5. Rejected ideas

| Idea | Why not |
|---|---|
| Postgres full-text search (`tsvector`) | Matches whole tokens or token prefixes only. WhatsApp matches substrings: «رآن» must hit «القرآن», and «قرآن» must hit «والقرآن» (attached و/ال/ب/ل). Arabic stemming would also change what matches. Results are newest-first, so ranking adds nothing. Keep pg_trgm. |
| Cache search results in Redis | Warm query is 24 ms; results depend on the role scope (sales hides link templates, teachers see only their phones), so the key must carry the scope; any new message invalidates; 5 staff accounts give almost no reuse. TanStack's 30 s cache already serves repeats. Redis does not fix the 173 ms cold read either. |
| Global search from 1–2 characters | `LIKE '%x%'` cannot use the trigram index below 3 characters: a full scan for a near-useless result. In-chat search keeps 1 character (one phone is ≤ 2k rows through `messages_phone_idx`). |
| A `count(*)` total in SQL | Node drops old-CRM link bodies (`looksCrmHistory`, api `chat-search.ts:29-32`) that `search_text` still holds, so a SQL count would exceed the hits shown. Total stays `hits.length` in Node. |
| A `(created_at desc, id desc)` index now | Only needed if common words get slow as the table grows (docs/37). Not measured slow today. |

## 6. Risks

| Risk | Guard |
|---|---|
| SQL fold and TS `searchFold` drift | the existing SQL-parity e2e (`e2e/tests/messaging/message-search.sql.spec.ts`) covers the new function too |
| Scope leak in in-chat search | the service keeps resolving `salesScope` / teacher `scope` before the repo call (`chat-search.service.ts:27-38`); `p_skip_templates` = `LINK_TEMPLATES` for sales, exactly as today |
| A common word in a 2k chat returns many rows | still capped at `SCAN_MAX`; far less than shipping the whole chat |
