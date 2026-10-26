# Web chat for the assistant (sales): fix plan

Owner 2026-10-19: «for the assistant the chat is not good … in the web». Audit workflow wf_f9c30fef-8a9 (6 lenses: space, messages, composer, list/live, access, header actions; every finding adversarially checked, then a design review). 31 confirmed findings, 5 dismissed.

**What is wrong today.** On a laptop the assistant's web chat is a fixed 720px column under about 300px of headers, clocks, nav and a wrapping row of buttons, and the reply box takes another 220px, so she sees 4–5 messages while WhatsApp Web shows 15 or more. On a half-screen window or a tablet the chat opens at the oldest message, and the whole page scrolls instead of the chat. She cannot open the photos, PDFs or voice notes families send, nothing tells her a new message arrived unless she is watching the list, and switching chats or closing the registration form throws away what she typed. Today on staging she also cannot answer any chat that has been quiet for more than 24 hours, because no template is enabled for sales yet, and the screen tells her to send a template or rating that she does not have.

## Fixes (one PR)

### W1 (major) The inbox fits the window: about 150px less chrome, no 1180px width cap, and the page itself stops scrolling — ✅ done

Files: `apps/web/src/components/shell/layout/FixedTopBarLayout.tsx`, `apps/web/src/components/shell/layout/TopBarLayout.tsx`, `apps/web/src/components/ui/layout/running-head.tsx`, `apps/web/src/components/shell/layout/inbox-route.ts`, `apps/web/src/features/messaging/inbox/threads/list/InboxPage.tsx`, `apps/web/src/features/messaging/inbox/threads/list/NewChatForm.tsx`, `apps/web/src/features/messaging/inbox/threads/list/ThreadList.tsx`, `apps/web/src/features/sales/sales/live/SalesLiveStrip.tsx`, `apps/web/src/routes/sales/inbox.tsx`, `apps/web/src/components/shell/layout/inbox-route.test.ts`

Scope: FixedTopBarLayout serves both sales and teacher, so the /sales/inbox and /teacher/inbox shells change. The admin shell (AdminLayout.tsx:72) stays as it is: do not edit the shared INBOX_PAGE. Add a new constant for the top-bar layout instead.

(1) FixedTopBarLayout.tsx:20: `inbox ? 'max-w-none' : 'max-w-[1180px]'` (`inbox` is already computed at :18).
(2) Clocks (docs/07 principle 7: keep all four): on the inbox, skip the separate RunningHead row (:24-26) and render the clocks inside the WideHeader row, between the Logo and the bell. Give WideHeader an optional `clocks?: ReactNode` and RunningHead an optional `className`, so the inline copy drops min-h-[54px]. Saves about 54px.
(3) Add `INBOX_PAGE_TOPBAR = cn(INBOX_PAGE, 'shell:m-0 shell:px-3 shell:pt-3 shell:pb-3')` in inbox-route.ts and use it at FixedTopBarLayout:27. Saves about 36px.
(4) InboxPage.tsx: move the PageHead (one Cartouche plus the «N محادثة» count, docs/07 principle 4) out of the page top into the list column's first row, so it no longer repeats the nav tab above the grid. It must stay a real cartouche, not sr-only. Add an optional `head?: ReactNode` prop rendered in that row. Saves about 56px.
(5) InboxPage.tsx:49: shell:min-h-[600px] → shell:min-h-[400px]; shell:grid-cols-[320px_minmax(0,1fr)] → shell:grid-cols-[clamp(300px,30%,400px)_minmax(0,1fr)]; gap-[22px] → gap-4. InboxPage is shared, so the admin and teacher inboxes get this too. That is intended: their grid has the same overflow.
(6) NewChatForm: the «محادثة جديدة» summary becomes an icon-only disclosure (aria-label t.inbox.newChat.title) in that head row. The form still unfolds below.
(7) ThreadList: pass the الكل/غير مقروءة SegmentedControl into TableToolbar's existing `end` slot instead of its own row (ThreadList.tsx:44-53). Saves about 50px.
(8) SalesLiveStrip: add a `compact` variant, one small chip link «N حلقة جارية» (t.sales.live.strip) to /sales/live. routes/sales/inbox.tsx:20 passes it as InboxPage `head` instead of rendering the 56px band above the page.

Result: about 150px of chrome. At 1366 the chat column is about 850px.

**Test:** inbox-route.test.ts: INBOX_PAGE_TOPBAR contains shell:m-0 and shell:p*-3, and INBOX_PAGE is unchanged. New FixedTopBarLayout.test.tsx: on /sales/inbox the root has max-w-none and the clocks render once, inside the header; on /sales/students the root keeps max-w-[1180px] and the separate running head. New InboxPage.layout.test.tsx (sales mode): [data-testid=inbox-layout] has shell:min-h-[400px] and the clamp column class; exactly one cartouche, inside the list column; the `head` node renders there. SalesLiveStrip.test.tsx: compact renders one link with the count, and nothing at 0. Before pushing, grep e2e/tests for `inbox-layout`, the «المحادثات» cartouche text and «محادثة جديدة», and update their selectors.

### W2 (major) The desktop composer becomes the compact one: one line capped at 128px, a round send button, Enter sends, focus stays in the box — ✅ done

Files: `apps/web/src/features/messaging/inbox/composer/components/Composer.tsx`, `apps/web/src/features/messaging/inbox/composer/components/ComposerPhone.tsx`, `apps/web/src/features/messaging/inbox/composer/components/TextComposer.tsx`, `apps/web/src/features/messaging/inbox/composer/lib/composer-keys.ts`, `packages/shared/i18n/ar.json`, `packages/shared/i18n/en.json`

Scope: all three inbox modes get the compact composer. This is the #112 pass that mobile already got.

(1) Composer.tsx:44: drop the `if (phone)` split and always render ComposerPhone. Delete the tall layout at :48-80. That also removes the duplicated sessionUntil line; the header chip already counts down, and ComposerPhone's one-line Notices keeps the gate note and the reply-from note.
(2) TextComposer: every caller is now compact, so delete the non-compact branch (the textarea classes at :84 and the separate «أرسل» row at :120-126) and the `compact` prop. The box keeps the JS autosize capped at COMPACT_MAX_PX = 128, which fixes the unbounded field-sizing growth.
(3) New composer-keys.ts: `sendsOnKey(e, desktop)`. It returns true for Ctrl/⌘+Enter always, and for plain Enter when `desktop && !e.shiftKey && !e.nativeEvent.isComposing`. TextComposer computes `desktop = !usePhone()`. Key it on the width, never on `compact`; below 640px Enter stays a new line.
(4) Visible hint: on desktop the placeholder becomes t.inbox.composer.placeholderDesktop «اكتب رسالة — Enter للإرسال، Shift+Enter لسطر جديد», with en parity. Update the comment at :73.
(5) In the mutation's onSettled, call `area.current?.focus()`, so the next message needs no click.

TextComposer must stay ≤ 150 lines; deleting the branch frees about 15.

**Test:** New composer-keys.test.ts: Enter with desktop=true sends; Shift+Enter, isComposing and Enter with desktop=false do not; Ctrl+Enter and ⌘+Enter send in both. New Composer.wide.test.tsx (matchMedia set to 1280px): renders the round send IconButton named «أرسل», no «رسالة عادية | قالب» SegmentedControl, and a textarea without min-h-[88px]. TextComposer.focus.test.tsx: after a mocked successful send the textarea is document.activeElement and empty. Grep e2e/tests for `Control+Enter` and for the «أرسل» button role; the name stays the same, so only Enter-dependent steps can need edits.

### W3 (major) One-row thread header: secondary sales actions go in «المزيد», and sales sees which children the chat is about — ✅ done

Files: `apps/web/src/features/messaging/inbox/threads/pane/ThreadHeader.tsx`, `apps/web/src/features/messaging/inbox/threads/pane/ThreadHeaderPhone.tsx`, `apps/web/src/features/messaging/inbox/sales-money/SalesChatActions.tsx`, `apps/web/src/features/messaging/inbox/sales-money/SalesSubscribeAction.tsx`, `apps/web/src/features/messaging/inbox/sales-money/use-sales-family-actions.tsx`, `apps/web/src/features/messaging/inbox/sales/SalesFamilyLine.tsx`, `apps/web/src/features/messaging/inbox/threads/pane/ThreadPane.tsx`, `apps/web/src/features/messaging/inbox/threads/pane/ThreadPaneWide.tsx`, `packages/shared/i18n/ar.json`, `packages/shared/i18n/en.json`

(0) Line budget first. ThreadPane.tsx is exactly 150 lines, so move its wide return block (:128-149) into ThreadPaneWide.tsx, which takes one props object: header, log, reply, aside, side, toast. W4, W5 and W12 build on this split.

(1) ThreadHeader.tsx:31 becomes two non-wrapping lines, following ThreadHeaderPhone.
- Row 1: `flex items-center gap-2 min-w-0`; the name at text-base, truncated (not text-h3); the phone inline; then `action`.
- Row 2: `flex gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] text-2xs`, holding the kind or lead chip, `<WindowBanner compact>`, the badge and source (admin only, as today) and timesInText() at the end, so principle 7 still holds.
- mb-4 pb-3 → mb-2 pb-2. About 60px instead of 101–141.
(2) Actions (sales only).
- New hook use-sales-family-actions.tsx moves SalesSubscribeAction's query, opened and course state out of the component. It returns `{ primary, items, dialogs }` as ReactNodes.
- SalesChatActions renders ONE visible secondary button: «تسجيل طالب جديد» on a lead, «اشتراك جديد» on a family of hers. Then ONE MoreMenu (components/ui/more-menu.tsx) holding «تحقق من التسجيل», each «جدّد الاشتراك — name», «سجّل تحويلًا بنكيًا» and «أيام الحلقات — name». Then `dialogs`, outside the menu; Dialog portals, and MoreMenu keeps its children mounted.
- Buttons in the header become variant=secondary (docs/07 principle 4: the send button is the one filled primary).
(3) Phones: ThreadHeaderPhone's `action` for sales is the same visible action reduced to an icon, plus the MoreMenu, so the name keeps its space at 375px.
(4) Children line, new SalesFamilyLine.tsx, rendered in row 2 in sales mode only.
- ThreadPane keeps `pages[0].people` for sales (today it nulls them at :70), but `badge` stays admin-only. Never call threadBadge for sales: subscriptions arrive nulled, so it would read «غير مشترك».
- For each child: name · <Ltr>code</Ltr> · StatusChip(t.enums.studentStatus[status]) · teacher_name. Then «الحلقة القادمة: {fullTime}» from pages[0].lessons[0].
- When people has children but salesFamilyQuery (the same query key, so it is cached) returns no students of hers, append the new string inbox.salesNotYours «يتابعه مساعد آخر أو الإدارة». The missing buttons then read as a handover.

**Test:** ThreadHeader.test.tsx (sales lead): exactly one visible action «تسجيل طالب جديد» and a «المزيد» button holding «تحقق من التسجيل»; the header has no flex-wrap class. SalesChatActions.test.tsx (family with 2 ended children): one visible «اشتراك جديد»; the menu lists both renew buttons and the transfer; clicking renew opens SalesMoneyFlow, and it stays open after the menu closes. New SalesFamilyLine.test.tsx: renders the child name, code, the status word and the teacher; shows «يتابعه مساعد آخر أو الإدارة» when the family query returns []; never renders «غير مشترك». ThreadHeaderPhone.test.tsx at 375px (sales lead): the h2 is not covered and the action is icon plus menu only. ThreadPane stays ≤ 150 lines (lint).

### W4 (major) The chat follows the conversation: full-screen chat below 900px, a jump-to-latest button with a count, and a snap to the bottom after she sends — ✅ done

Files: `apps/web/src/components/ui/layout/use-narrow.ts`, `apps/web/src/features/messaging/inbox/threads/pane/ThreadPane.tsx`, `apps/web/src/features/messaging/inbox/messages/components/MessageBubble.tsx`, `apps/web/src/features/messaging/inbox/messages/components/MessageLog.tsx`, `apps/web/src/features/messaging/inbox/messages/components/JumpToLatest.tsx`, `packages/shared/i18n/ar.json`, `packages/shared/i18n/en.json`

(1) use-narrow.ts: add `useBelowShell()` for '(max-width: 56.24rem)'. Leave usePhone alone; the dialogs depend on it.
- ThreadPane.tsx:42 uses `phoneView = useBelowShell()`. From 640 to 899px the thread is then the existing PhoneChat, ThreadHeaderPhone and compact composer (after W2 the composer no longer branches on width).
- In admin mode this also moves the lead/family panel into ThreadSideSheet in that band. That is intended: BOX.xl has the same no-scroll bug there.
- MessageBubble.tsx:80-81: switch the `max-sm:` tints to `max-shell:`, or the bg-sunk bubbles vanish on the phone log's bg-sunk ground.
(2) MessageLog.tsx: mirror `pinned` into state `away`, set in onScroll only when it changes. Record `seenId` = newest id while pinned. While away, render a new JumpToLatest.tsx: a sticky bottom-2 button at the inline end, aria-label inbox.jumpLatest «الانتقال إلى أحدث رسالة», with the count of messages after seenId. On click: scrollTop = scrollHeight, pinned = true.
(3) Snap (as built, review M1): her own sends are recorded in `own-send.ts` (`recordOwnSend(phone, messageId)` by TextComposer, TemplateComposer and, since round 2 I, SendRatingButton). The log snaps to the bottom, even while away, when the row with that id arrives, whatever its status by then (the send waits for a sender pass, so it comes back `sent` or `failed`, rarely `queued`). A colleague's or an automatic outbound row never moves her. Not keyed on `status === 'queued'`.

Applies to all modes. MessageLog stays well under 150 lines with the button in its own file.

**Test:** New MessageLog.jump.test.tsx: mock scrollHeight/clientHeight, scroll up, rerender with one new inbound message → the button shows «1»; click → scrollTop equals scrollHeight and the button is gone; rerender with a new outbound queued row while away → it scrolls without the button. New ThreadPane.narrow.test.tsx: matchMedia (max-width: 56.24rem) = true → renders [data-testid=phone-chat], and the composer textarea is inside it. The existing MessageLog.pin.test.tsx still passes. Grep e2e/tests for `phone-chat` and check that the specs using an 800px viewport (if any) still find the header.

### W5 (major) Unsent work survives: a reply draft per chat, text typed during a send is kept, and a failed background poll no longer blanks the chat — ✅ done

Files: `apps/web/src/features/messaging/inbox/composer/lib/draft-store.ts`, `apps/web/src/features/messaging/inbox/composer/components/TextComposer.tsx`, `apps/web/src/features/messaging/inbox/threads/pane/ThreadPane.tsx`, `apps/web/src/features/messaging/inbox/threads/pane/ThreadPaneWide.tsx`

(1) New draft-store.ts: a module-level, subscribable `Map<phone, { text, failed: { text, id, code } | null }>` with get, set and clear (as built, review M2; the plan's single `requestId` per draft was replaced). TextComposer reads it through useSyncExternalStore (subscribeDrafts) and writes to it on change; the id is picked at submit with requestIdFor. The draft therefore survives a thread switch (InboxPage.tsx:76 and ThreadPane.tsx:102 key by phone), the قالب toggle, and the window flipping. A retried draft keeps its clientRequestId (rule 8).
(2) Submit (as built): the clientRequestId is chosen AT SUBMIT: the failed send's id when the box holds exactly that failed text (trimmed), else a fresh `crypto.randomUUID()` (rule 8). The box empties at once. onError: the text comes back only if the box is still empty (new typing is never overwritten), and `failed = { text, id, code }` is stored. The failed id is dropped on ANY successful send for that phone and as soon as the box text differs from `failed.text` (round 2 C), so it is never replayed later for an unrelated identical text. While a chat's send is in flight no box for it can send (`mutationKey ['inbox-send', phone]`), even one mounted since. Never call setText('') after the POST returns; that is what wipes text typed during the send.
(3) ThreadPane.tsx:61: `if (detail.isError && !detail.data)`. When the query is in error but still has data (a refetch failed after 3 retries), keep the log and composer and show one small `<p role="status">` with t.common.error above the log. Do not use sendErrorText; nothing was sent.

All modes. Keep TextComposer ≤ 150 lines: the store and W2's key helper are separate files.

**Test:** New draft-store.test.ts: set, get, clear, and isolation per phone. New TextComposer.draft.test.tsx: type, unmount, remount with the same phone → text restored; another phone → empty. Submit with a mocked failing send → text restored and the retry sends the same clientRequestId. Submit, type «ب» before the mock resolves, resolve → the box still holds «ب». New ThreadPane.refetch-error.test.tsx: seed the query with data, then make a refetch fail → the log and the textarea still render, the error line shows, and «لم تُرسل الرسالة» is absent.

### W6 (major) Photos and PDFs from families open in the chat (access bug: docs/16 row 1b promises bubble media for sales) — ✅ done

Files: `apps/api/src/modules/messaging/inbox/files/thread-file.controller.ts`, `apps/api/src/modules/messaging/inbox/files/thread-file.http.test.ts`, `apps/api/src/modules/messaging/inbox/inbox.module.ts`, `apps/web/src/features/messaging/inbox/api/api.ts`, `apps/web/src/features/messaging/inbox/messages/components/MessageMedia.tsx`, `apps/web/src/features/messaging/inbox/messages/components/MessageBubble.tsx`, `e2e/tests/inbox-media.spec.ts`, `packages/shared/i18n/ar.json`, `packages/shared/i18n/en.json`

This is the only API change in the routine, allowed because docs/16 row 1b says media inside messages «shows in every thread» for sales, while MessageViews.view is always called without a URL (sales-threads.service.ts:47).

(1) API: a new ThreadFileController with GET /threads/:phone/messages/:messageId/file and class-level @Permissions('inbox.read'). It must NOT live in ThreadMediaController, whose class-level inbox.media would apply.
- Resolve the caller like ThreadsController.scopes: an admin or a salesperson (SalesScope) gets ThreadMediaService.file({ phone, messageId }), which already returns 404 message_not_found for another phone's message and 410 media_expired.
- A teacher (TeacherScope) gets 403 `media_forbidden`, keeping today's rule «a teacher never sees a payment proof» (thread-media.controller.ts:9-10). See the owner question.
- Do not sign URLs inside detail(): the detail query polls every 10s over up to 50 rows.
- MIME: keep InboundMedia's INVOICE_MIMES (jpeg, png, webp, heic, pdf). Audio and video stay labels until the owner answers. **Superseded 2026-10-19 (docs/21 D1, D2):** W6 now also serves inbound audio/video (`CHAT_VIEW_MIMES`, up to 16 MB, `ThreadMediaService.bubbleFile`) and the files staff sent (`out/…`); the daily purge deletes stored inbound audio/video 30 days after it arrived (photos and PDFs are kept).
- Add the route to parity/access-before.json as ["admin","sales"] if the parity check requires it.
(2) Web: move Media (MessageBubble.tsx:21-35) into a new MessageMedia.tsx.
- For an inbound image or PDF MIME, render a button «عرض {kind}». On click it runs `threadFileQuery(m.phone_e164, m.id)` (useQuery, enabled after the click, staleTime under the signed URL's TTL), then shows an `<img>` thumbnail that opens full size in a new tab, or a named link for a PDF. HEIC is a link.
- A 410 shows the new string inbox.mediaExpired «انتهت صلاحية الملف».
- Other MIMEs keep today's label.
(3) Update e2e/tests/inbox-media.spec.ts:43,45, which asserts the placeholder.

**Test:** New thread-file.http.test.ts: a sales user gets 200 and a signed url for a message of that phone; a message of another phone → 404 message_not_found; a teacher → 403 media_forbidden; a role without inbox.read → 403. Expired media → 410. New MessageMedia.test.tsx: an image row makes no request on render; a click fetches /threads/%2B9665…/messages/<id>/file and renders an img with the signed url; a 410 → «انتهت صلاحية الملف»; an audio/ogg row shows the label only and never fetches.

### W7 (major) Closed window or no allowed template: tell sales what she can do, instead of offering a template and a rating she does not have — ✅ done

Files: `apps/web/src/features/messaging/inbox/threads/pane/window-state.ts`, `apps/web/src/features/messaging/inbox/threads/pane/WindowBanner.tsx`, `apps/web/src/features/messaging/inbox/composer/components/ComposerPhone.tsx`, `apps/web/src/features/messaging/inbox/composer/components/TemplateComposer.tsx`, `apps/web/src/features/messaging/inbox/composer/lib/allowed-templates.ts`, `apps/web/src/features/messaging/inbox/threads/pane/NewThread.tsx`, `packages/shared/i18n/ar.json`, `packages/shared/i18n/en.json`

Sales and teacher modes only. The admin's wording and controls stay as they are.

(1) window-state.ts: windowText(lastInboundAt, now, mode). When closed and mode ≠ 'admin', return the new inbox.window.closedStaff «المحادثة مغلقة — يُعاد فتحها عندما يراسلك ولي الأمر أو بقالب متاح لك». «أو تقييمًا» stays admin-only, matching SendRatingButton.tsx:42. WindowBanner passes useInboxMode().
(2) New allowed-templates.ts: move the filter from TemplateComposer.tsx:41-44 into `allowedTemplates(list, teacher)`, shared by TemplateComposer and ComposerPhone.
(3) In a non-admin mode, once templatesQuery has loaded and the list is empty:
- ComposerPhone hides the template IconButton toggle.
- On a closed window, ComposerPhone renders one line instead of TemplateComposer: the new inbox.composer.noAllowedHelp «انتهت مهلة 24 ساعة ولا يوجد قالب متاح لك. يمكنك الرد فور أن يراسلك ولي الأمر، أو اطلب من الإدارة تفعيل قالب.»
- TemplateComposer shows that line instead of the disabled select and button (:89-116).
- NewThread.tsx:21-22 shows inbox.newChat.noAllowed «لا يمكنك بدء محادثة الآن: لا يوجد قالب متاح لك. اطلب من الإدارة تفعيل قالب.» instead of firstTemplate plus the empty composer.
All strings MSA, with en parity. The real fix (an enabled template) is the template-sync owner question.

**Test:** window-state.test.ts: closed with mode 'sales' and with mode 'teacher' → text without «تقييم»; closed with mode 'admin' → unchanged. New TemplateComposer.empty.test.tsx (sales mode, templates []) → the help line, no combobox, no disabled «أرسل قالبًا» button. ComposerPhone.test.tsx (open window, sales, empty list) → no template toggle; (closed, sales, empty) → the help line only. NewThread.test.tsx (sales, empty list) → the noAllowed line and no form.

### W8 (major) Unread count on «المحادثات» and in the tab title, still updating while the tab is in the background — ✅ done

Files: `apps/web/src/features/sales/sales/use-sales-unread.ts`, `apps/web/src/components/shell/nav/SectionShells.tsx`, `apps/web/src/features/sales/sales/SalesNav.tsx`, `apps/web/src/components/shell/nav/SectionLinks.tsx`

(1) New use-sales-unread.ts.
- useQuery with queryKey ['threads','nav-count','unread'], under ['threads'] so ThreadPane's existing invalidation refreshes it.
- queryFn apiFetch('/threads?unread=true&page=1&pageSize=1'), select total, refetchInterval INBOX_REFRESH_MS, refetchIntervalInBackground: true, enabled can('inbox.read').
- A useEffect sets document.title to `(${n}) ${t.app.name}` while n > 0 and back to t.app.name at 0 (boot.tsx:24 sets the base).
(2) SectionLink gets an optional `count?: string`. SectionLinks renders it after the label, like AdminNav's NavCount, using the existing t.nav.unread «{n} غير مقروءة», so it is part of the link's accessible name.
(3) SalesShell (SectionShells.tsx:37-41) calls the hook and passes the count to SalesNav for the /sales/inbox item.

Sales shell only. The count is the shared academy unread, the same number the admin sees.

**Test:** New use-sales-unread.test.tsx: a mocked total of 3 → returns 3 and document.title is «(3) …»; then 0 → title restored; the query options have refetchIntervalInBackground true; disabled without inbox.read (no fetch). SectionLinks.test.tsx: an item with count «3 غير مقروءة» renders it inside the link's name; an item without a count is unchanged.

### W9 (major) «تسجيل طالب جديد» keeps its draft and step when she closes it to re-read the chat — ✅ done

Files: `apps/web/src/features/messaging/inbox/sales/SalesRegisterAction.tsx`, `apps/web/src/features/messaging/inbox/sales/register-drafts.ts`, `apps/web/src/features/teaching/booking/BookingWizard.tsx`

Do NOT keep the Dialog mounted with `hidden`: dialog.tsx:56-60 locks body scroll on mount, and the focus trap would stay active.

(1) New register-drafts.ts: a module Map<phone, { draft: BookingDraft; step: StepKey }>.
(2) BookingWizard gets two optional props in its existing options object: `initialStep?: StepKey` (used in the useState at :55 when present) and `onProgress?: (p: { draft; step }) => void`, called from a useEffect on [draft, step]. The admin callers pass neither, so the admin wizard is unchanged.
(3) SalesRegisterAction passes `initial = saved?.draft ?? draftFromThread(thread)`, `initialStep = saved?.step` and `onProgress` → map.set(phone, …). It clears the entry when the wizard reaches BookedPanel (ChatReturnContext close after a booking). Closing with ✕ or Esc keeps it.

Ceiling: the drawer still covers the thread while it is open. A non-modal pane in place of the list column is the follow-up if she still has to close it to read.

**Test:** New SalesRegisterAction.draft.test.tsx: open, fill the guardian name, go to step 2, close with Esc, reopen → same step and the name kept; another thread's phone → a fresh draftFromThread. BookingWizard.test (existing) still passes without the new props; with initialStep 'teacher' the wizard starts on that step.

### W10 (minor) Day separators at every width, and only the clock time on each bubble — ✅ done

Files: `apps/web/src/features/messaging/inbox/messages/components/MessageLog.tsx`, `apps/web/src/features/messaging/inbox/messages/components/MessageBubble.tsx`

MessageLog.tsx:54: use `withDays(messages, now)` for every fill, not only 'phone'. Update the doc comment at :43. With separators drawn, the bubble stamp uses clockText(created_at) instead of stampText (format.ts:75), and keeps fullTime in the `title` tooltip. All modes.

**Test:** New MessageLog.days.test.tsx: fill 'shell' with messages from yesterday and today → two separators «أمس» and «اليوم» in order; the bubbles show «HH:MM» without a date; the title holds the full date.

### W11 (minor) Links in messages are clickable — ✅ done

Files: `apps/web/src/features/messaging/inbox/messages/lib/linkify.ts`, `apps/web/src/features/messaging/inbox/messages/components/MessageBubble.tsx`

New linkify.ts: `splitLinks(text): Array<{ text: string; href?: string }>`, matching only /https?:\/\/[^\s]+/ and trimming trailing . , ، ؛ ) from the match. MessageBubble Content (:51-55) renders a link part as `<a href target="_blank" rel="noopener noreferrer" dir="ltr" className="break-all underline underline-offset-4 text-lapis">`. Signed links are already stripped server-side for sales (withoutLinks). Quoted replies need an API change and are left out.

**Test:** New linkify.test.ts: «رابط https://a.b/c.» → the link without the trailing dot; http is linked; javascript:alert(1), www.x.com and ftp:// stay text; Arabic text around a link is kept in order.

### W12 (minor) The chat's controls follow the editable sales role's permissions instead of breaking with a generic error — ✅ done

Files: `apps/web/src/features/messaging/inbox/threads/pane/ThreadPane.tsx`, `apps/web/src/features/messaging/inbox/composer/components/Composer.tsx`, `apps/web/src/features/messaging/inbox/composer/components/TemplateComposer.tsx`, `apps/web/src/features/messaging/inbox/composer/components/TextComposer.tsx`, `apps/web/src/routes/sales/index.tsx`, `packages/shared/i18n/ar.json`, `packages/shared/i18n/en.json`

Non-admin modes. Admin mode is unchanged.

(1) ThreadPane `reply`: when !can('inbox.send'), render a read-only line with the new inbox.sendNotAllowed «لا تملك صلاحية الإرسال من هذه المحادثة», like ownThreadReadOnly.
(2) Enable templatesQuery (ThreadPane.tsx:45, TemplateComposer.tsx:37) and sendGateQuery (Composer.tsx:30) only when can('messages.read').
(3) sendErrorText (send-error.ts, with sendErrorCode / sendErrorCodeText): a 403 without a code maps to the new inbox.error.forbidden «غير مسموح لك بالإرسال» instead of send_failed.
(4) routes/sales/index.tsx:6 redirects to the first SALES_NAV_ITEMS entry whose permission the user holds, instead of always /sales/inbox.

**Test:** TextComposer.errors.test.ts: an ApiError with status 403 and no code → «غير مسموح لك بالإرسال»; 409 session_closed → unchanged. New ThreadPane.permissions.test.tsx (sales, inbox.send off): no textarea and the read-only line shows; with messages.read off, no /messaging/templates request is made. New routes/sales/index.test.tsx: without inbox.read → redirects to the next allowed nav item.

### W13 (minor) An open chat in an unfocused window no longer marks new messages read for everyone — ✅ done

Files: `apps/web/src/features/messaging/inbox/api/api.ts`

Web-only, replacing the API `peek` idea. api.ts threadQuery uses `refetchInterval: () => (document.hasFocus() ? INBOX_REFRESH_MS : false)`. The list query keeps polling, so the unread rows and W8's count still rise. TanStack's refetchOnWindowFocus follows `visibilitychange` only, which never fires when she switches back from another window, so (as built, review M4) ThreadPane calls `useWindowFocus(detail.refetch, phone)`: the window's `focus` event refetches the open chat (marking it read) and re-arms the focus-gated poll.

Ceiling: someone reading on a second monitor without focus sees new messages only after clicking that window. Separate read marks per person would need an API change. All modes.

**Test:** api.test.ts: with document.hasFocus mocked false, threadQuery('+966…').refetchInterval() returns false; with true it returns INBOX_REFRESH_MS; threadsQuery keeps a numeric interval. Grep e2e/tests for specs that drive two pages (wa-two-lines, journey-7-assistant-cycle) and call page.bringToFront() before waiting on a thread poll.

## Review fixes

### Round 1 (commit 35607a0d)

- **M1** The log snaps on HER send (own-send store, recorded by both composers), not on any queued row (W4 step 3).
- **M2** A new clientRequestId at each submit; a failed send keeps `{text, id}` and only that text reuses it; `mutationKey` per phone blocks a remounted box while the send is pending; draft-store is subscribable, so a remounted box sees a restored failure and never loses new typing (W5 step 2).
- **M3** A register draft for another lead is dropped; a past first lesson resumes with no slot on the slot step; /sales/booking refuses a past trial start with 400 `date_in_past` (review text + «اختر موعدًا آخر»).
- **M4** The open chat refetches on the window `focus` event (useWindowFocus), re-arming its focus-gated poll (W13).
- **m5** Inline header clocks only from a width where they fit (1100px then; 1340px since round 2 E). **m6** Compact inbox toolbar. **m7** Router Link for the live chip. **m8** Read-only line and the times' city below 900px. **m9** Teacher media label + 403 `media_forbidden` fallback. **m10** No template form without messages.read. **m11** Drafts cleared on sign-out. **m12** «المزيد» returns focus to its trigger. **m13** Sales dialogs kept across 900px (SalesChatFrame). **m14** sr-only dates and jump count. **m15** A loaded media file kept on a failed refetch. **m16** Read wording for a refused thread load. **m17** Unread count cleared without inbox.read, and no 401 retries.

### Round 2

- **A** «المزيد» closes (and focuses its trigger) only for a click whose DOM target is inside its panel: React clicks bubble through portals, so a click or typing in a dialog an entry opened (the registration check; CreateUserDialog from the student profile's «المزيد») no longer pulls focus out of the dialog.
- **B** m13 completed: on a lead chat «تسجيل طالب جديد» and, in every sales chat, «تحقق من التسجيل» keep their open state and dialogs in useSalesFamilyActions `dialogs` (rendered by SalesChatFrame above the width switch), so crossing 900px keeps them open.
- **C** A failed send's clientRequestId is dropped on any successful send for that phone, and as soon as the box text differs from the failed text: a much later identical text is never replayed under the old id.
- **D** draft-store and own-send carry a generation bumped by their clearAll; a send captures it at submit and a write from an older generation (a send settling after sign-out) is ignored. The three tab memories (drafts, own sends, register drafts) are also cleared on Supabase `SIGNED_OUT` (web-push-session.ts), covering the account_disabled sign-out in me.ts.
- **E** The header clocks inline only from 1340px (measured with the real fonts: ~1190px ar, ~1324px en, worst-case dates); below that the separate running-head row shows. The inline box keeps `whitespace-nowrap` and clips with `overflow-hidden` as a guard.
- **F** A restored register draft whose first lesson has passed says so: `resumable` reports `droppedPast`, and the dialog shows one FormAlert line «موعد أول حلقة قد مضى، اختر موعدًا قادمًا».
- **G** After 400 `date_in_past`, «اختر موعدًا آخر» first clears `startsAt` and the extra picks, so «التالي» cannot lead back to the same refusal.
- **H** A send that fails after the box remounted shows its reason: the error code is stored with `failed` and shown (with `aria-invalid`) while the box holds that text and nothing is pending.
- **I** «إرسال تقييم الحلقة» records her own send, so the log follows the rating.
- **J** No messages.read and no allowed template read differently: useNoneAllowed returns a reason (`no_permission` | `no_template`); the permission case says «لا تملك صلاحية إرسال القوالب، فاطلب من الإدارة منحك صلاحية قراءة الرسائل» (ComposerPhone, TemplateComposer, NewThread). A teacher's or a 403 media label says «عرض الملفات غير متاح لك» (permanent); files we do not store yet keep «عرض الملفات غير متاح هنا بعد».
- **K** This section, and W4 step 3, W5 steps 1-2 and W13 corrected to match the code.

## Decided defaults (no change in this PR)

- Teachers keep seeing only the label of a file in their families' chats (a photo may be a payment proof): W6 returns 403 media_forbidden to a teacher.
- In a family chat whose children she did not bring, the assistant keeps no money/course actions; W3 says «يتابعه مساعد آخر أو الإدارة».

## Open owner questions (NOT in this PR)

- Sales has no template it may send, so she cannot answer any chat that has been quiet for more than 24 hours, or start a new one. Syncing the chat number's templates reads from the real WhatsApp account. May the admin do it now on staging? Options: Yes: sync the chat number on /admin/templates now. This imports free_trial_invite and welcome_greeting already flagged for sales; then submit trial_reschedule to Meta / Instead, tick «متاح للمعلمين والمبيعات» on templates already approved on the notifications number / Wait until the WhatsApp cut-over; sales replies only inside the 24-hour window until then. Recommended: Yes: sync the chat number on /admin/templates now. This imports free_trial_invite and welcome_greeting already flagged for sales; then submit trial_reschedule to Meta.
- **Decided 2026-10-19 (docs/21 D1):** voice notes and videos families send play inside the chat (web `<audio>`/`<video>`, mobile inline players in APK 0.2.0), stored up to 16 MB; stored inbound audio/video is deleted after 30 days (photos and PDFs are never purged).
- Teachers cannot open any file in their families' chats today, because a photo may be a payment proof. Should that change now that sales and the admin can open them? Options: No, keep it as today: teachers see the label only / Voice notes and videos yes; photos and PDFs no / Yes, every file in their own families' chats. Recommended: No, keep it as today: teachers see the label only.
- **Decided 2026-10-19 (docs/21 D2):** the assistant and the admin send images (JPG/PNG) and PDFs inside the 24-hour window, from the web chat and the phone, stored in wa-media and logged under her name. Teachers get 403 `files_forbidden`.
- **Decided 2026-10-19 (docs/21 D3):** a new lead alerts every assistant; a chat of a family or lead an assistant owns alerts only her; an unowned chat alerts every assistant; admins unchanged.
- **Decided 2026-10-19 (docs/21 D4):** every outgoing bubble shows «أرسلها: {name}» (the teacher's display name, else the staff member's full name) or «رسالة تلقائية» for a job's send; teachers see the same names.
- In a family's chat whose children she did not bring (every imported student, or another assistant's family), the assistant cannot renew, record a transfer or set lesson days. Should she be able to? Options: No: keep it to her own students; the chat says «يتابعه مساعد آخر أو الإدارة» and the admin sets brought_by on imported families / Yes, for any family she chats with; commission stays with whoever brought the student / Yes, for any family; commission goes to whoever records the subscription. Recommended: No: keep it to her own students; the chat says «يتابعه مساعد آخر أو الإدارة» and the admin sets brought_by on imported families.

## Decisions 1–4 as built (2026-10-19, docs/21)

- **D1 voice/video:** wa-media takes WhatsApp's audio/video up to 16 MiB (migration 500). W6 (`bubbleFile`) signs inbound audio/video and photos/PDFs; web plays them in `MediaPlayer` (falls back to «افتح {kind}»), mobile in inline players (APK 0.2.0). `WaMediaRetentionJob` (daily) deletes stored inbound files of `PLAYABLE_MIMES` 30 days after they arrived; a purged file answers 410 «انتهت صلاحية الملف». Invoice/receipt copies and photos/PDFs are untouched.
- **D2 sending files:** `POST /threads/:phone/file-upload-url` then `POST /threads/:phone/file` (`ThreadFileSender`): window checked server-side first, the upload path tied to actor and request id, the sniffed bytes must match Storage's mime. Sent by link (`type: image|document`), the same body on Meta and Kapso. Web: paperclip «أرفق صورة أو ملف PDF» and FileComposer (caption, «أرسل»); mobile: images and PDFs. A file row cannot be handed off to wa.me (409 `media_handoff`).
- **D3 alerts:** `PushService.notifySales`, owners from the lead's `assigned_to` and the guardian's `brought_by`/converted leads; teachers' numbers alert admins only.
- **D4 names:** `messages.created_by` points at profiles (migration 510); MessageView gains `sender_name` and `automatic`, rendered through `senderLine` on web and mobile.
