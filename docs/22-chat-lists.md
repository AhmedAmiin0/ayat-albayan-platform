# 22 — Chat lists («القوائم», like WhatsApp Business)

Owner request 2026-10-20: «add the ability to create lists like whatsapp business».

## Owner answers (2026-10-20) — these override anything below

1. **Chat lists, not broadcast lists.** Lists only ORGANISE chats: a row of chips above the chat
   list («الكل», then the academy's lists); tapping a chip shows only that list's chats. Nothing is
   ever sent to a family because of a list.
2. **One shared set for the academy.** Like one WhatsApp Business account on several phones: any
   assistant (base role sales) or admin creates, renames and deletes lists and adds/removes chats;
   everyone sees the same lists and the same members.
3. **Teachers: no lists** (no preference given → the default). The teacher's chat view is unchanged.

## 1. Model

- A list = an academy-wide name (1–30 characters, trimmed, unique ignoring case and Arabic letter
  variants: reuse the shared Arabic normalisation `normalizeArabic` in `packages/shared/src/core/format/arabic.ts`), at most 30
  lists. Order: oldest first (no reordering in v1).
- A member = a chat, keyed by its `phone_e164` (the merged inbox thread across both WhatsApp lines).
  A chat can be in many lists. Adding twice is a no-op; removing a non-member is a no-op.
- Deleting a list removes the list and its memberships ONLY — never a chat, message, lead or family.
- Migration `20261020000520_chat_lists.sql` (above the highest on develop; renumber if another lands
  first): `chat_lists(id uuid pk, name text, name_key text unique, created_by → profiles, created_at,
  updated_at)` and `chat_list_threads(list_id → chat_lists on delete cascade, phone_e164 text with
  the repo's E.164 check, added_by → profiles, added_at, primary key (list_id, phone_e164))`, an index
  on `chat_list_threads(phone_e164)`. RLS on both (follow the repo's pattern for API-only tables).
  Never edit an existing migration. Update `packages/db/src/types.ts`.

## 2. Permission

- New catalog row `inbox.lists` (area messaging, `grants: ['sales']`; the system admin holds every
  permission), i18n label in `permissions.items`, and a seed migration granting it to the system
  sales role (see `catalog.data.ts` header and migration 20261012000430 for the pattern). The API
  parity json must be updated the way earlier permission additions did it.
- Every lists endpoint needs `inbox.read` + `inbox.lists`. The UI shows lists only with
  `inbox.lists` and never in teacher mode.

## 3. API (NestJS, apps/api/src/modules/inbox or a sibling `chat-lists` module)

- `GET /chat-lists` → `[{ id, name, count }]` (count = members).
- `POST /chat-lists { name }` → 201 the list; 409 `list_name_taken`; 409 `list_limit` at 30.
- `PATCH /chat-lists/:id { name }` → the list; 404 unknown; 409 `list_name_taken`.
- `DELETE /chat-lists/:id` → 204.
- `PUT /chat-lists/:id/threads/:phone` and `DELETE /chat-lists/:id/threads/:phone` → 204,
  idempotent; 404 for an unknown list; the phone is validated E.164 (the thread need not have a
  message yet — a new-chat number can be added).
- `GET /threads?list=<uuid>`: only that list's chats, combinable with the existing search, unread,
  status and sort. Unknown list → empty page (not 500).
- The thread detail (`GET /threads/:phone`) returns `lists: [{ id, name }]` for callers with
  `inbox.lists` (omitted or empty otherwise).
- Shared zod schemas + types in `packages/shared/src/messaging/` (name schema reused by web, mobile
  and API).

## 4. Web (admin `/admin/inbox` and assistant `/sales/inbox`)

- **Chip row** at the top of the thread list (InboxListHead area): «الكل» (default) then each list
  by name, then «＋ قائمة جديدة». The active chip is the URL search param `list` (InboxSearch, parsed
  like the other params; an unknown id falls back to «الكل»). Keep the existing unread / status /
  sort controls as they are — do not duplicate «غير المقروءة» as a chip.
  The row scrolls horizontally inside itself on narrow widths; it must NEVER widen the page (#120:
  `min-w-0`, `overflow-x-auto`, no horizontal page scroll at 390px).
- **Create**: «＋ قائمة جديدة» opens a small dialog: the name field, «إنشاء»; server errors shown
  inline (name taken, limit). The new list becomes the active chip.
- **Rename / delete**: while a list chip is active, a «تعديل القائمة» button next to the row opens a
  dialog with the name field, «حفظ», and «حذف القائمة» behind a confirmation that says the chats
  themselves are not deleted.
- **Add/remove a chat**: in the open thread's header actions (the MoreMenu of `sales-money/SalesChatActions.tsx` on /sales; the matching header actions of the admin thread on /admin) an item «القوائم»
  opens a checklist of every list (checked = member) with «قائمة جديدة» at the end (creates and adds
  in one go). Toggling saves immediately (optimistic, rolled back on error). The thread header shows
  the chat's lists as small quiet chips (a chip click activates that list in the chip row).
- An empty list shows «لا محادثات في هذه القائمة بعد. افتح محادثة واختر «القوائم» لإضافتها.»
- Query keys: lists under `['chat-lists']`; membership changes invalidate `['threads']` and the
  thread detail. Refetch on window focus like the thread list (another assistant may have changed
  them).

## 5. Mobile (apps/mobile, admin + assistant trees; JS only — NO new native module)

- The same chip row above ThreadsList (horizontal ScrollView, 44pt touch targets, RTL order).
- «＋» opens a sheet with the name field; long-press (and an accessible action) on a list chip opens
  rename / delete (with the same confirmation).
- ThreadScreen header actions get «القوائم»: a sheet with the checklist + «قائمة جديدة».
- Must ship as an OTA: `node tools/scripts/ci-checks/native-changes.mjs c140b4cc` has to keep saying «no
  native change».

## 6. Copy (packages/shared/i18n ar.json in clear MSA + en.json parity), namespace `inbox.lists`

Suggested Arabic: القوائم · الكل · قائمة جديدة · اسم القائمة · إنشاء · تعديل القائمة · حفظ ·
حذف القائمة · «حذف القائمة لا يحذف المحادثات.» · «يوجد قائمة بهذا الاسم.» · «بلغت الحد الأقصى
للقوائم (30).» · إضافة إلى قائمة.

## 7. Tests (next to the code)

- shared: name schema (trim, 1–30, normalisation key), phone check.
- API: service + http tests — create/rename/delete, duplicate name (Arabic variants) 409, limit 409,
  idempotent add/remove, cascade on delete, `GET /threads?list=` with search/unread, 403 without
  `inbox.lists`, teacher role 403 by default; permission parity.
- web: chip row (URL param, unknown id, horizontal overflow classes), create/rename/delete dialogs,
  the thread «القوائم» checklist (optimistic + rollback), teacher mode shows no lists.
- mobile: chips, create sheet, long-press rename/delete, thread checklist, teacher tree unchanged.
- e2e: one Playwright journey (an assistant creates «بانتظار الدفع», adds a chat from the thread,
  filters by the chip, renames, deletes; the chat remains) + an SQL spec (RLS on, cascade).

## 8. Design review

docs/07 tokens only (no raw hex), chips look like the existing filter chips, Arabic-first RTL,
visible focus, 44px targets, loading/empty/error states, light/dark, 390px with no page overflow.

## 9. As built (2026-10-20)

- **DB**: `20261020000520_chat_lists.sql` (both tables, the phone index, `v_list_threads` = a list's
  members joined to `v_threads` for `GET /threads?list=` (filtered in SQL, service role only), the `chat_lists_cap` trigger: a
  serialised 30-list backstop raising 23514 «at most 30 lists», RLS on both: the admin reads, writes are
  the API's) and `20261020000521_chat_lists_permission.sql` (inbox.lists for the system admin and sales).
- **Permission**: `inbox.lists` (area messaging, grants sales); parity json rows `ChatListsController.*`
  for admin and sales; `roles.seed.test.ts` reads migration 521.
- **API**: `modules/chat-lists` (controller, service, queries, guard). Every route: `@Permissions('inbox.lists')`
  plus an inline check of `inbox.read` and the base role (admin or sales; a teacher is 403
  `lists_forbidden` even if a custom role grants the key). A malformed `:id` is 404 `list_not_found`, a
  bad `:phone` 400 `invalid_phone`. `DELETE /chat-lists/:id` is 204 whether or not the list exists.
  `GET /threads?list=` (ThreadsQueries reads `v_list_threads`) and the detail's `lists` go through
  `inbox/chat-list-filter.ts` (ThreadReads). Names that are only tashkeel / tatweel are refused (400);
  any E.164 chat number may be a member (landlines too).
- **Shared**: `packages/shared/src/messaging/chat/chat-lists.ts` (name schema, key, phone check, error codes,
  `ChatList` / `ChatListRef`); `ThreadDetail.lists?`.
- **Web**: `apps/web/src/features/inbox/lists/` — the chip row (`ChatListsBar`, `ChatListChips`, `ListChip`),
  create / edit / delete dialogs, the thread checklist (`ThreadListsDialog`, `use-membership.ts`:
  optimistic, rolled back on error) reached from «المزيد» (`SalesChatFrame`, admin and sales), the
  header chips (`ThreadListChips`). `InboxSearch.list` (a uuid; unknown → «الكل» via `activeList`).
- **Mobile**: JS only (no native change), admin and assistant trees.
- **Tests**: shared, API (service, queries, guard, http, threads list/detail, parity, seed), web, mobile,
  `e2e/tests/messaging/chat-lists.spec.ts` (the journey) and `e2e/tests/messaging/chat-lists.sql.spec.ts` (RLS, cascade, key,
  E.164, cap, seed).


## 10. القوائم التلقائية (owner 2026-10-25)

Owner: «add once + keep updated: add every family with a running subscription to «مشترك» and every teacher
to «معلم» now, then add new ones automatically; never remove anyone added by hand».

- **Rules** (`chat_lists.auto_rule`, migration `20261025000710_chat_list_auto_rules.sql`; at most one list
  per rule): `subscribed` on «مشترك», `teachers` on «معلم», attached by the app's name key
  (`chatListNameKey`: «مشترك» → `مشترك`, «معلم» / «مُعلّم» → `معلم`); a missing list is created
  (`created_by` null). At the 30-list cap the migration stops with an error (nothing applied): delete a
  list, then push again.
- **What is added**: once (backfill) and then by triggers — «مشترك»: the guardian's phone when a student is
  inserted as, or becomes, `active` (also when the student moves to another guardian), and a guardian's
  new phone while one of their students is `active` (R-STU-05: `pending_renewal` is not «مشترك»); «معلم»: the phone of a
  teacher inserted or updated as `active`, and an active teacher's new phone. Only numbers that pass the
  members' E.164 check; `added_by` stays null for automatic rows; adding twice is a no-op.
- **Never removed**: the triggers only add. A hand-added chat stays, and an automatic member stays when the
  subscription ends or the teacher stops (a person removes it by hand if needed; it may come back on the
  next activation). Members are added and removed by hand exactly as on any list; rename and delete work as
  before; deleting the list drops its rule (the delete confirmation says «ستتوقف الإضافة التلقائية إلى هذه
  القائمة.»; a list made again by hand has no rule). Statuses other than `active`
  (new, trial, pending_subscription, pending_renewal, expired, paused, churned) never add, so a chat removed
  by hand stays out when the package ends and comes back only on a renewal (`→ active`).
- **UI**: an automatic list shows the chip «تُحدَّث تلقائيًا» and one line («يُضاف إليها تلقائيًا كل ولي أمر
  لديه اشتراك جارٍ، ولا يُحذف منها أحد تلقائيًا» / «يُضاف إليها تلقائيًا كل معلم نشِط، ولا يُحذف منها أحد
  تلقائيًا») under the chip row while it is shown, in the chat's
  «القوائم» checklist and in «تعديل القائمة» (web and mobile). `GET /chat-lists` items carry `auto_rule`
  (`'subscribed' | 'teachers' | null`).
- **Tests**: `e2e/tests/messaging/chat-list-auto-rules.sql.spec.ts` (backfill, each trigger path, idempotency,
  invalid phones, nothing removed, a list without a rule untouched, grants).
