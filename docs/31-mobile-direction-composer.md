# 31 — Mobile: RTL/LTR like WhatsApp + WhatsApp-style composer (plan)

Read-only mapping 2026-10-27 (workflow wf_f4983f1c-407, 21 agents: direction model, 9 area sweeps each adversarially verified, composer spec). Owner decisions 2026-10-27: (1) language AND direction follow the phone like WhatsApp (English phone → English + LTR, Arabic phone → Arabic + RTL; More → «اللغة» overrides); (2) voice notes: YES, real WhatsApp voice notes (record in the app, the API converts to ogg/opus with ffmpeg); (3) composer like WhatsApp Business: emoji · text · paperclip · camera in the pill, round mic/send; «قالب», «الردود السريعة», «عرض سعر» move into the paperclip sheet («/» still opens quick replies); ~80 built-in emoji (no emoji library).

Extra item from the owner (2026-10-27 screenshot): the note over the composer («سيصل ردّك عبر خط… · يمكنك الرد برسالة عادية حتى …», ComposerNotes.tsx) must never cut the line name: wrap to two lines or stack, never an ellipsis.

## Order

1. F first, alone. Merge it to develop (fast lane, but run the whole mobile and shared suites in CI, because core/ is imported everywhere). No OTA yet. Q1 must be answered, or the default A accepted, before F's locale item merges.

2. Once F is on develop, T, S and C each branch from it and build in parallel; their paths are disjoint.
- Merge T and S as they go green. Both are display-only, so auto-merge is fine.
- C merges LAST. It rebases on develop after T, because its physical-row.ts deletion needs ChatHeader free of it. It also waits for the owner's review (sends_to_families) and is never auto-merged.

3. C's merge deploys the API to staging (CHAT_FILE_MIMES, sniff, ffmpeg image). Confirm that the deploy is live before the OTA; otherwise the app's audio/mp4 upload gets 400 file_type.

4. Publish ONE OTA on the 0.3.0 runtime, and only after F, T, S and C are all on develop. Do not publish between merges:
- T without C gives Arabic phones a mirrored header and bubbles under a WhatsApp-English composer.
- T without F flips the bubbles on the still-forced-RTL English phone (the 10-26/27 «layout is reversed» complaint).

5. Fallback if Q2/Q3 are still open when T and S are green: C ships PART A alone as PR 1 on cloud/whatsapp-composer. The round button stays today's send, with no API change. The single OTA follows that PR. PARTS B, C and D come later as PR 2 from the same package, with the API deploy before their own OTA. If Q2 is a no, PART C (voice), the voice keys and PART D are dropped entirely.

6. After the OTA, check on a test phone in both English and Arabic:
- Field, ComposerInput and ReportTextField alignment while typing Arabic and English
- the OTP and amount caret
- the swipe-to-reply direction
- the header chevron
- the bubble sides

Use only test chats; no real families.

## Foundation

Package F, "rtl-foundation", branch cloud/rtl-foundation. It owns apps/mobile/src/core/, apps/mobile/jest.setup.cjs, packages/shared/src/format/ (new text-dir.ts plus its test), packages/shared/src/index.ts (one export line), packages/shared/src/i18n/locale.ts (comment only) and docs/07-design-system.md.

What it provides:
1. Direction source (WhatsApp model). locale-switch.ts:47 changes so that nothing saved means the phone's direction, read through expo-localization getLocales()[0]?.textDirection. reloadInto (:21-32) stays the only code that touches allowRTL/forceRTL.
2. textDir(s) in packages/shared: returns 'rtl', 'ltr' or null from the first strong character.
3. A ContentText primitive beside AppText: content-directed alignment of user-authored text.
4. isolate(s) (FSI…PDI) beside the existing ltr() in core/ui/primitives/Ltr.tsx: free text spliced into a UI-language sentence.
5. The shared Field input fix. Free text aligns by what is typed; `ltr` fields get Yoga direction 'ltr' on the wrapper.

No new mirrored-icon primitive is needed. <Chevron to='prev'|'next'> (core/ui/primitives/Chevron.tsx:16-31) plus the existing scaleX wrapper pattern (inbox/shared/chat-icons.tsx:100-104) cover every arrow. Add one only if a third new arrow shows up.

Explicitly unchanged: app.json and app.config.ts (no supportsRTL/forcesRTL; the guard at app-config.test.ts:28-31 stays), no swapLeftAndRightInRTL, and LanguageRow. F needs no i18n keys. All other packages build on F.

## Package rtl-foundation (F) — branch `cloud/rtl-foundation`

Status: built 2026-10-27 (items 1-9) on `cloud/rtl-foundation`. Additions from review: phoneLocale also falls back to 'ar' when the phone gives no direction; textDir treats RLM/LRM as strong and covers the RTL blocks above U+FFFF.

Owns (only these paths): `apps/mobile/src/core/`, `apps/mobile/jest.setup.cjs`, `packages/shared/src/format/`, `packages/shared/src/index.ts`, `packages/shared/src/i18n/locale.ts`, `docs/07-design-system.md`

Sends to families: false

1. apps/mobile/src/core/lib/i18n/locale-switch.ts:47: `const wanted = saved !== null ? parseLocale(saved) : phoneLocale()`. phoneLocale() returns getLocales()[0]?.textDirection === 'rtl' ? 'ar' : 'en', inside try/catch that returns 'ar', so boot never throws if the native module is missing. Fix the comments at :36 and at core/lib/i18n/locale.ts:4-7.
2. locale-switch.test.ts, using jest.mock('expo-localization'). (a) English phone, nothing saved, current 'ar': reloadInto('en') with allowRTL(false) and forceRTL(false); this replaces :21-27. (b) Arabic phone, nothing saved: no reload. (c) Saved 'ar' on an English phone wins. (d) Saved 'en' on an Arabic phone wins. The tests at :37-43 and :70-74 get getLocales -> [{textDirection:'rtl'}].
3. apps/mobile/jest.setup.cjs: add a global jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'ar', textDirection: 'rtl' }] })). jest-expo's moduleMocks has no ExpoLocalization mock, so without it importing locale-switch could throw, or the default would silently become 'en'. *.en tests are unaffected (they mock I18nManager).
4. packages/shared/src/core/format/text-dir.ts (new): textDir(s) gives 'rtl' for an Arabic, Hebrew, Syriac or Thaana first strong character, 'ltr' for any other letter, and null when there is none. Add text-dir.test.ts (>= 80%: Arabic, Latin, digits only, an isolate prefix, empty) and an export line in packages/shared/src/index.ts.
5. apps/mobile/src/core/ui/primitives/ContentText.tsx (new): AppText plus a `source: string` prop; textAlign = (textDir(source) ?? ui) === ui ? 'left' : 'right', where ui = I18nManager.isRTL ? 'rtl' : 'ltr'. No writingDirection. Tests: ContentText.test.tsx (RTL: English gets 'right', Arabic 'left') and ContentText.en.test.tsx (Arabic gets 'right').
6. apps/mobile/src/core/ui/primitives/Ltr.tsx: add `export const isolate = (s: string) => `⁨${s}⁩`` beside ltr() at :9-11.
7. apps/mobile/src/core/ui/form/Field.tsx:66-67: delete both writingDirection and textAlign 'left'. :39: wrapper View style={ltr ? { direction: 'ltr' } : undefined}, so the input's paddingEnd (:55) and PasswordToggle end:0 stay on one side. Fix the comments at :10 and :19. Do not keep textAlign for ltr fields (the students-booking variant); that goes to the device check.
8. Field tests: Field.test.tsx (RTL) and Field.en.test.tsx. A free-text input has no textAlign or writingDirection. An ltr Field's TextInput parent has direction 'ltr'. For ltr plus secureTextEntry, the toggle sits in that same View. Update core/ui/primitives/AppText.test.tsx:18-22, which pins Field's textAlign 'left'. This one change covers all 5 Field findings (core-auth x2, routes, schedule, students-booking) and 44 call sites.
9. Stale guidance: replace docs/07-design-system.md:814 ('I18nManager.forceRTL(true) at boot') with a short direction list: the language in effect sets direction (the phone by default); only locale-switch touches the flags; logical rows; isRTL only for translateX, gesture dx, scaleX and SVG; content-directed text uses ContentText; LTR islands use ltr()/isolate(). Fix the comment at packages/shared/src/i18n/locale.ts:1-2 (the Arabic default is the web's; mobile falls back to the phone).

## Package rtl-chat-thread (T) — branch `cloud/rtl-chat-thread`

Owns (only these paths): `apps/mobile/src/inbox/messages/`, `apps/mobile/src/inbox/thread/`

Sends to families: false

1. apps/mobile/src/inbox/messages/hooks/bubble-side.ts:15-24: bubbleSide(ours) => { align: ours ? 'flex-end' : 'flex-start', outer: ours ? 'end' : 'start' }. Drop the rtl param, side and toCentre. Rewrite bubble-side.test.ts.
2. apps/mobile/src/inbox/messages/components/MessageBubble.tsx:74 bubbleSide(ours). Drop side={side} at :112 and I18nManager at :2; fix the comment at :48-49. Rewrite MessageBubble.side.test.tsx and MessageBubble.side.en.test.tsx so both expect outbound 'flex-end' and inbound 'flex-start'.
3. apps/mobile/src/inbox/messages/components/SwipeReply.tsx:28-31,39: module-scope `const dir = I18nManager.isRTL ? -1 : 1` passed to swipeClaims, swipeOffset and swipeAnswers (hooks/swipe.ts:25-36); deps become [x, onReply]. ReplyIcon at start: 4 (:55). Remove the side prop and the BubbleSide import. Fix the comments at :9-10 and swipe.ts:17-21 ('toward the end'). Tests: RTL, where -dx answers both bubbles; SwipeReply.en.test.tsx, where +dx does.
4. apps/mobile/src/inbox/thread/calls/entries/CallEntry.tsx:27 alignSelf: bubbleSide(ours).align. Drop I18nManager at :2; fix the comment at :18-19. Extend CallEntry.test.tsx and add CallEntry.en.test.tsx.
5. apps/mobile/src/inbox/thread/components/ChatHeader.tsx:28-46: a plain 'row' of [back IconButton <Chevron to='prev' size={22}>][names, flex 1, minWidth 0, alignItems 'flex-start'][trailing], with marginStart -10 and the marginEnd branch at :38-39 deleted. Remove the physicalRow (:8) and I18nManager (:2) imports and fix the comments at :16, :23-24 and :45. Rewrite ChatHeader.side.test.tsx (RTL: leftToRight(row,true) = [trailing…, chat-names, back]) and ChatHeader.side.en.test.tsx ([back, chat-names, trailing…]). Do NOT delete inbox/shared/physical-row.ts; package C owns that.
6. apps/mobile/src/inbox/messages/text/LinkedText.tsx:59-76: render the body through ContentText source={text}, keeping selectable and a11y, and delete writingDirection at :68. LinkSpan at :33: drop writingDirection and render the link text as part.text + '‎' (display only, href unchanged), skipped when the body is selectable. Do not use ltr() there. Update LinkedText.test.tsx and add an Arabic-body case.
7. QuoteBlock.tsx:52-57, MessageMenu.tsx:65-75 (source quoteText(quoteOf(m))), copy-download/CopySheet.tsx:53-66 (source request?.text ?? '', no marks added, still selectable) and resend/ResendSheet.tsx:48 (source RESEND_TEXT): use ContentText and delete writingDirection. Add ResendSheet.en.test.tsx asserting textAlign 'right'. The resend text that is sent stays unchanged.
8. apps/mobile/src/inbox/messages/components/QuoteStrip.tsx:37-44: split into a row of [sender AppText `${sender} ·`, flexShrink 0, numberOfLines 1][ContentText source={text}, flex 1, numberOfLines 1]. Move the accessibilityLabel to the row and delete writingDirection. CloseIcon is not mirrored.
9. apps/mobile/src/inbox/thread/calls/screen/Initials.tsx:7: `name.match(/\p{L}/u)?.[0] ?? '?'`. Unit tests: initialOf(ltr('+966 50 000 0001')) is '?', 'أحمد علي' gives 'أ', blank gives '?'.

## Package rtl-screens (S) — branch `cloud/rtl-screens`

Owns (only these paths): `apps/mobile/src/student-file/`, `apps/mobile/src/teacher/`, `apps/mobile/src/feedback/`, `apps/mobile/src/payments/`, `apps/mobile/src/finance/`, `apps/mobile/src/sales-money/`, `apps/mobile/src/ops/`, `apps/mobile/src/trial-date/`, `apps/mobile/src/calendar/`, `apps/mobile/src/meetings/`

Sends to families: false

1. apps/mobile/src/student-file/channel/ChannelBubble.tsx:18: alignSelf m.mine ? 'flex-end' : 'flex-start' (no isRTL); optional tail with borderTopEndRadius / borderTopStartRadius xs. :30: body through ContentText source={m.body}. :33: delete writingDirection. Keep the time's textAlign 'right' at :41. Add ChannelBubble.side.test.tsx and ChannelBubble.side.en.test.tsx.
2. apps/mobile/src/teacher/report/components/ReportTextField.tsx:60-61: delete writingDirection 'auto' and textAlign 'left' (keep textAlignVertical 'top'). Add ReportTextField.test.tsx and ReportTextField.en.test.tsx asserting that neither key is present.
3. apps/mobile/src/ops/reports/ReportFieldRow.tsx:15 and apps/mobile/src/feedback/FeedbackRow.tsx:43: render the value or note with ContentText. FeedbackRow.en.test.tsx: the Arabic note gets 'right'. New FeedbackRow.test.tsx (RTL): an English note gets 'right'. ReportFieldRow gets an RTL test and a .en test.
4. apps/mobile/src/payments/components/AmountField.tsx:49 and apps/mobile/src/finance/pricing/DiscountField.tsx:39: writingDirection 'ltr' becomes direction 'ltr' on the TextInput; keep textAlign. Add AmountField.test.tsx and AmountField.en.test.tsx, extend DiscountField.test.tsx and add DiscountField.en.test.tsx.
5. isolate() from core/ui/primitives/Ltr.tsx for user names and free text inside UI sentences: ops/dashboard/work-text.ts:13 ({student}), ops/activity/activity-format.ts:44 (actor name), trial-date/lib/trial-date-text.ts:51 ({name}), finance/payouts/PayoutFacts.tsx:34 ({note}), sales-money/components/MyPaymentItem.tsx:26 (note) and sales-money/lib/money-text.ts:49 ({reason}). Update work-text.test.ts, activity-format.test.ts:29-33, ops/activity/ActivityScreen.test.tsx:46 (regex), trial-date-text.test.ts:25 and money-text.test.ts:20, and add a .en case with an Arabic name each.
6. apps/mobile/src/calendar/overview/overview-text.ts:48 freeLabel: replace the whole span with `t.schedule.free.replace('{from} – {to}', ltr(`${from} – ${to}`))`, keeping the old per-placeholder replaces as the fallback. Both bundles hold that exact span (ar.json:546 and en.json:546). The key, the web overview.ts:73 and any DB translation override stay valid, and no i18n file is touched. Update calendar/overview/overview.test.ts:79, calendar/calendar.en.test.ts:21 and calendar/screens/DayScheduleScreen.test.tsx:50,58.
7. apps/mobile/src/meetings/invite/invitee-draft.ts:22: label ltr(formatPhone(result.e164)); key and input.phone stay raw E.164 (rule 7). Update invitee-draft.test.ts:12 and meetings/screens/MeetingsScreen.schedule.test.tsx:69. Add an InviteeChips .en.test.tsx.
8. apps/mobile/src/meetings/manage/MeetingLinkShare.tsx:14: replace <Ltr selectable> with a plain selectable AppText, numberOfLines 2, no writingDirection or textAlign, so a copied URL carries no isolates. Update MeetingsScreen.schedule.test.tsx:88 to getByText('https://app/m/new') and assert there is no U+2066 or U+2069.

## Package whatsapp-composer (C) — branch `cloud/whatsapp-composer`

Owns (only these paths): `apps/mobile/src/inbox/composer/`, `apps/mobile/src/inbox/threads-list/OpenRow.tsx`, `apps/mobile/src/inbox/threads-list/ClosedRow.tsx`, `apps/mobile/src/inbox/saved-replies/`, `apps/mobile/src/inbox/shared/chat-icons.tsx`, `apps/mobile/src/inbox/shared/composer-icons.tsx`, `apps/mobile/src/inbox/shared/physical-row.ts`, `apps/mobile/src/inbox/shared/physical-row.test.ts`, `apps/mobile/src/app-config.test.ts`, `packages/shared/i18n/`, `packages/shared/src/messaging/`, `apps/api/src/modules/messaging/inbox/files/`, `apps/api/src/modules/messaging/whatsapp/`, `apps/api/src/modules/teaching/booking/invoice/invoice-sniff.ts`, `apps/api/Dockerfile`

Sends to families: true

1. PART A, direction (not owner-gated). threads-list/OpenRow.tsx:37 and ClosedRow.tsx:16 become flexDirection 'row' with children in reading order. Drop the physicalRow and I18nManager imports and rewrite the comments at OpenRow.tsx:30-33 and ClosedRow.tsx:9-13.
2. A: inbox/shared/chat-icons.tsx:36-57 SendIcon: wrap the Svg in a View testID='send-icon' with transform scaleX(I18nManager.isRTL ? -1 : 1), as ReplyIcon does at :100-104, and fix the comment. Tests: RTL expects -1 and .en expects 1. Same commit as the OpenRow change.
3. A: saved-replies/SavedRepliesButton.tsx:28: end:0 becomes start:0 (same commit as ClosedRow). saved-replies/quick-list/QuickReplyRow.tsx:26: delete writingDirection, render the body through ContentText (or a textDir style passed to HighlightText), and make slashTitle at :16 use isolate(). Fix the comment at :21. Add an RTL test and a .en test with Arabic and English bodies.
4. A: composer/ComposerInput.tsx:44: remove textAlign 'left'. composer/TemplatePreview.tsx:36: use ContentText instead of writingDirection 'auto'.
5. A: rebase on T, then delete inbox/shared/physical-row.ts and physical-row.test.ts; grep first that ChatHeader no longer imports it. Keep physical-row.helpers.ts. Rewrite composer/Composer.side.test.tsx (RTL: open-row and closed-row orders per the spec §10) and add Composer.side.en.test.tsx (the reverse, English strings).
6. PART B, anatomy (owner Q3). composer/ComposerPill.tsx: a 'row' pill of [EmojiButton][ComposerInput flex 1, with the border, radius and background at ComposerInput.tsx:36-38 removed and onSelectionChange added][staff: AttachFile + CameraButton (hidden while there is text) | teacher: TemplateIcon]. composer/RoundAction.tsx: a 44pt round button, MicIcon when the text is empty with no staged file, else the mirrored SendIcon, with a 120 ms crossfade and none under reduce motion. OpenRow keeps testID 'open-row'. inbox/shared/composer-icons.tsx: MicIcon, CameraIcon and EmojiIcon, never mirrored. Update Composer.layout.test.tsx:59-64 (the pill border arithmetic).
7. B: composer/emoji/EmojiSheet.tsx + emoji-list.ts (about 80 curated emoji, row + wrap) insert at the caret through the existing type() path. composer/AttachSheet.tsx extracted from AttachFile.tsx:21-50 as a grid of round tiles: «المعرض», «الكاميرا», «مستند PDF», «قالب», «الردود السريعة» (staff), «عرض سعر» (pricing.read). composer/send-file.ts:24 ChatFileSource += 'camera', and :52-58 calls pickReceipt('camera'). CameraButton plus use-pick-send.ts. ClosedRow content stays: «أرسل قالبًا» at the end, no pill and no mic.
8. B: i18n. Add inbox.composer.emoji, camera, gallery and document, and inbox.composer.voice.* (record, hint, slideCancel, started, cancelled, delete, micBlocked, failed) to packages/shared/i18n/ar.json (MSA) and en.json; parity is enforced by i18n-parity.test.ts. Reuse calls.mic.openSettings. C is the only package that edits the i18n files.
9. PART C, voice (owner Q2). composer/voice/ contains voice-machine.ts (pure reducer), voice-drag.ts (towardStart(dx, rtl), micShift; >= 80% in both directions), use-voice-recorder.ts (expo-audio HIGH_QUALITY, mono, 48 kbps, metering), MicHold.tsx (responder pattern from Waveform.tsx:59-66, onResponderTerminationRequest false), RecordingBar.tsx, send-voice.ts and voice-support.ts.
10. C: recording sequence: requestRecordingPermissionsAsync, then prepareToRecordAsync, then check canRecord, then record(); prepare again after each stop. MIN_MS 700 and MAX_MS 10 min. On background, terminate or MAX: stop and keep. On unmount: discard. Read inbox/thread/calls/state/call-context.ts useCalls() (read-only) to offer no mic during a call; claimPlayback pauses notes. TalkBack: a tap starts a locked recording, with announcements. Upload with mime audio/mp4, filename voice.m4a and one requestId per recording reused on retry (rule 8), plus replyToMessageId. app-config.test.ts:4,11: title and comment only; prop values unchanged.
11. PART D, API (deploy before the OTA). packages/shared/src/messaging/chat/chat-files.ts: add CHAT_VOICE_MIME 'audio/mp4' and CHAT_FILE_MIMES = [...CHAT_SEND_MIMES, CHAT_VOICE_MIME]; chatFileProblem checks CHAT_FILE_MIMES. Do NOT widen CHAT_SEND_MIMES (saved replies and web attach reuse it). schemas.ts:24 uses z.enum(CHAT_FILE_MIMES). apps/api/src/modules/teaching/booking/invoice/invoice-sniff.ts: add OggS and ftyp (excluding HEIC brands) entries; invoices still refuse audio.
12. D: apps/api/src/modules/messaging/inbox/files/voice-ogg.ts (new): toVoiceOgg(bytes, run), a temp-file ffmpeg run (-ac 1 -ar 48000 -c:a libopus -b:a 24k -application voip) with a 30 s timeout that returns null on failure. thread-file-send.service.ts:82-84 (99 lines; extract a helper to stay <= 150): for audio/mp4, download, transcode, then upsert out/{actor}/{request}/voice.ogg and send it as audio/ogg. Keep the m4a for replay; on null, send the m4a (Tier A) and log a warning.
13. D: whatsapp/whatsapp.types.ts:56-63 MediaSend gets voice?: boolean. whatsapp/sender/message.dispatch.ts:105-107 sets voice: baseMime === 'audio/ogg'. whatsapp/messages/wa-components.ts:111 emits voice:true for audio only. whatsapp/sender/send-plan.ts:133 labels with waSendKind («رسالة صوتية»). The CRM driver stays document-only. apps/api/Dockerfile:20-23: add ffmpeg to the runtime apt-get. Vitest next to each file. Any WhatsApp test uses only Meta test credentials and the allow-list, never Kapso and never real families.

## Composer spec (package C)

BUILD SPEC: WHATSAPP-STYLE COMPOSER (mobile; logical layout, so it mirrors with the phone language)

0. PRINCIPLES
- Follow the RTL/LTR target rules already set:
  - Direction is read only via I18nManager.isRTL.
  - Plain flexDirection 'row' with children in reading order; no physicalRow.
  - Write start/end in new styles.
  - Physical values (translateX, gesture dx, scaleX) are the only things that branch on isRTL.
- Keep every existing rule:
  - 24 h window closed → templates only; restricted roles get the server allow-list (403 template_not_allowed).
  - ReopenNote, GateNote, ComposerNotes, QuoteStrip, saved-reply «/» list and chip, QuoteSheet, drafts (draft-store), the clientRequestId reuse in use-composer-send.ts, teacher mode (no files).
- Rules 1-4: ≤150 lines per file, ≤3 params, strict TS, tests next to the code.

1. OPEN-WINDOW ROW (replaces threads-list/OpenRow.tsx:34-50; keep testID 'open-row')
Structure: outer View, flexDirection 'row', alignItems 'flex-end', gap 6, containing [ComposerPill][RoundAction].

ComposerPill (new, composer/ComposerPill.tsx)
- View, flex 1, flexDirection 'row', alignItems 'flex-end', minHeight 44.
- borderRadius shape.radius.pill, borderWidth 1 ruleInput, backgroundColor raised, paddingHorizontal 2.
- Children in reading order:
  (a) EmojiButton: IconButton labelled t.inbox.composer.emoji, with EmojiIcon.
  (b) ComposerInput: flex 1, with NO border, radius, background or textAlign (delete ComposerInput.tsx:36-38 and :44). Keep paddingVertical 8 and lineHeight 26, so one line is still 44: 26 + 16 + the pill's 2 × 1 border. Add onSelectionChange so the emoji sheet can insert at the caret. The placeholder stays t.inbox.composer.placeholder.
  (c) The end slot:
    - staff: AttachFile (paperclip), then CameraButton. The camera is rendered only while text.trim()==='' (WhatsApp hides it while typing).
    - teacher: the Template IconButton (TemplateIcon); no clip, no camera.

RoundAction (new, composer/RoundAction.tsx)
- A 44pt filled circle (IconButton variant 'filled' look), testID 'round-action'.
- MIC mode when ALL hold: open && !teacher && voiceSupported() && text.trim()==='' && !replies.staged && no voice recording is stopped or failed.
- Otherwise SEND mode.
- MIC mode:
  - Icon: MicIcon, never mirrored.
  - accessibilityLabel t.inbox.composer.voice.record, accessibilityHint t.inbox.composer.voice.hint.
  - Gestures: §3.
- SEND mode:
  - Icon: SendIcon, mirrored by wrapping it in scaleX(isRTL ? -1 : 1) as chat-icons.tsx:100-104 does.
  - Label t.inbox.composer.send.
  - onPress does exactly today's onSend: replies.dismiss(); sendText().
  - Disabled while pending, or when there is nothing to send (no text, no staged file, no recording).
- Morph: the same element with a 120 ms opacity/scale crossfade on the icon only (RN Animated). No animation when AccessibilityInfo.isReduceMotionEnabled.

Expected physical order (the tests assert these with leftToRight(row, rtl)):
- LTR (English phone): [emoji][input][clip][camera] [round]
- RTL (Arabic phone): [round] [camera][clip][input][emoji]

2. CONTROLS
- EMOJI: opens composer/emoji/EmojiSheet.tsx, a fade Modal bottom sheet like AttachSheet.
  - Contents: a FlatList grid of a curated static list (composer/emoji/emoji-list.ts, about 80 common emoji). A row with flexWrap, so it mirrors.
  - A tap inserts at the caret: text.slice(0, sel.start) + e + text.slice(sel.end), through the same type() path, so the «/» detection and renew() still run. The sheet stays open for more taps. «تم» or a tap outside closes it and refocuses the input.
  - ponytail: a curated set, not a full picker (no search, categories, skin tones, stickers or GIF). A real picker means a dependency; add it only if the owner asks.
- PAPERCLIP: AttachFile opens AttachSheet (extract it to composer/AttachSheet.tsx).
  - A grid of round 56pt tiles with a label under each, row + flexWrap, logical order:
    «المعرض» (pickChatFile('image')), «الكاميرا» ('camera'), «مستند PDF» ('pdf'), «قالب» (opens TemplatePicker), «الردود السريعة» (staff: replies.open), «عرض سعر» (only when onQuote).
  - «إلغاء» closes it.
  - The file flow stays as today: send immediately, reply quote included and cleared on success, error to ErrorLine.
  - This is the WhatsApp Business pattern: quick replies live in the attach sheet and in «/».
  - DESIGN CALL to confirm with the owner: the template moves one tap deeper for staff. The «/» list and SlashSuggestions stay unchanged.
- CAMERA:
  - send-file.ts:24 `ChatFileSource = 'image' | 'pdf' | 'camera'`.
  - pickChatFile (:52-58) uses pickReceipt(source === 'camera' ? 'camera' : 'library'). pickReceipt already runs ensureCameraPermission and gives a JPEG q0.6 with no EXIF.
  - CameraButton = IconButton t.inbox.composer.camera (CameraIcon, never mirrored). It calls the same pick-and-send function AttachFile uses; share it through a small hook, use-pick-send.ts.
- TEXT: unchanged behaviour (draft-store, «/» detection, maxLength 4096, grows to 120 then scrolls).

3. HOLD-TO-RECORD (staff, open window)
Files:
- composer/voice/MicHold.tsx: a responder View wrapping the round button.
- composer/voice/use-voice-recorder.ts: the expo-audio wiring.
- composer/voice/voice-machine.ts: a pure reducer.
- composer/voice/voice-drag.ts: pure functions.
- composer/voice/RecordingBar.tsx.
- composer/voice/send-voice.ts.
- composer/voice/voice-support.ts.

Recorder:
- useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 48000, isMeteringEnabled: true }).
- useAudioRecorderState(recorder, 100) gives durationMillis and metering in dB.

States (voice-machine.ts; unit-tested ≥80% in both directions):
idle → arming → holding → (cancelled | locked | sending) → stopped → sending → idle | failed.

Responder (pattern of Waveform.tsx:59-66): onStartShouldSetResponder true, onMoveShouldSetResponder true, onResponderTerminationRequest → false.
- GRANT:
  - If getRecordingPermissionsAsync() is not granted: if canAskAgain, call requestRecordingPermissionsAsync() and end the gesture; the next press records, as WhatsApp does. If it is blocked, show the micBlocked line with «افتح الإعدادات» (Linking.openSettings).
  - If granted: claimPlayback('recorder', stop) (pauses any playing note), await recorder.prepareToRecordAsync(), check recorder.getStatus().canRecord, recorder.record(), store the start pageX/pageY, state = holding.
- MOVE:
  - dx = pageX - startX, dy = pageY - startY (physical).
  - toStart = dx * (isRTL ? 1 : -1). This is the pure towardStart(dx, rtl).
  - Cancel when toStart > CANCEL = max(100, 0.35 × window width): stop, discard, announce t.inbox.composer.voice.cancelled.
  - Lock when -dy > LOCK (80) and toStart < CANCEL/2.
  - Visuals: the round button's translateX = dx clamped to the start side, [-CANCEL, 0] in LTR and [0, CANCEL] in RTL. Both values are physical, so there is no sign flip; this is the pure micShift(dx, rtl, max). The slide hint's opacity = 1 - toStart/CANCEL. A small lock badge above the button rises with -dy.
- RELEASE:
  - holding and duration < MIN_MS (700): stop, discard, show the hint line «اضغط مطولًا للتسجيل، وارفع إصبعك للإرسال».
  - holding otherwise: stop, then send.
  - locked: nothing.
- TERMINATE (the system took the touch): stop and keep the recording (state stopped). Never lose a recording.
- AUTO: at MAX_MS (10 min), stop and keep it (stopped).
- AppState 'background': stop and keep it (stopped).
- Unmount (leaving the chat): stop and discard. ponytail: no per-chat voice drafts.

RecordingBar replaces the pill's contents. Draft text is not touched; the mic only shows when the text is empty anyway.
- holding: [red dot (blinking Animated opacity; static when reduce motion; danger token)][<Ltr>{mediaTime(ms/1000)}</Ltr>][spacer flex 1][<Chevron to='prev' size 16> + t.inbox.composer.voice.slideCancel]. The hint centres in the pill. The chevron points to the start, so it mirrors by itself.
- locked / stopped / failed: [IconButton TrashIcon, label voice.delete][red dot (locked only)][<Ltr> timer][level bars: about 20 bars in a 'row', fed by metering; they fill from the start].
  - The round button shows SEND.
  - Send: in locked state stop first, then send; in stopped or failed state send the kept file again.
  - Delete: stop if needed, discard, announce.

Send (send-voice.ts):
- bytes = await (await fetch(uri)).arrayBuffer(), the same trick send-file.ts:47 uses for PDFs.
- send.mutateAsync({ phone, file: { mime: 'audio/mp4', bytes, size, filename: 'voice.m4a' }, id, maxBytes, replyToMessageId: reply?.id }).
- id = requestId() minted ONCE per recording and reused for retries (rule 8).
- Success: clear the reply quote (as AttachFile.tsx:79-82) and return to idle; the row joins through useSendFile.
- Failure: state failed. The recording stays in the bar with Send = retry and Trash; the error goes to ErrorLine through fileError.
- Respect pending: no send while another send of this chat is in flight.

voiceSupported(): Platform.OS === 'android' and expo-audio's AudioModule.AudioRecorder is a function, inside try/catch.

4. CLOSED WINDOW / NEW CHAT (threads-list/ClosedRow.tsx)
- Same content, logical: flexDirection 'row' in reading order [SavedRepliesButton (dimmed, staff)][QuoteButton][ClosedNote flex 1][Button «أرسل قالبًا»].
- «أرسل قالبًا» therefore sits at the END, where the round button sits; it mirrors in RTL.
- No pill, no mic, no emoji.
- ReopenNote and the ClosedNote copy are unchanged. TemplatePicker is unchanged: restricted roles still get only the server allow-list.

5. TEACHER MODE
- Pill: [emoji][input][TemplateIcon]. RoundAction is always SEND (disabled when empty).
- No clip, camera or mic, because the API refuses teacher files with 403 files_forbidden.

6. REPLY QUOTE AND STAGED FILE
- QuoteStrip stays above the row while open. Text, files and voice notes all answer it through replyToMessageId.
- A staged saved-reply file forces SEND mode.
- Replace QuoteStrip's writingDirection 'auto' (QuoteStrip.tsx:44) and TemplatePreview's (TemplatePreview.tsx:36) with the content-direction primitive from the RTL plan (ContentText + shared textDir).

7. ICONS
- New file shared/composer-icons.tsx (chat-icons.tsx is 125 lines): MicIcon, CameraIcon, EmojiIcon. Same 24 grid, 1.75 stroke, hidden from screen readers. Never mirrored.
- SendIcon in chat-icons.tsx gets the scaleX wrapper and its comment fixed.
- TrashIcon already exists (:83). Chevron comes from core/ui/primitives/Chevron.tsx.

8. I18N (packages/shared/i18n ar.json and en.json, MSA; parity enforced by i18n-parity.test.ts)
- inbox.composer: emoji «الرموز التعبيرية» / «Emoji»; camera «الكاميرا» / «Camera»; gallery «المعرض» / «Gallery»; document «مستند PDF» / «Document».
- inbox.composer.voice:
  - record «سجّل رسالة صوتية» / «Record a voice message»
  - hint «اضغط مطولًا للتسجيل، وارفع إصبعك للإرسال» / «Hold to record, release to send»
  - slideCancel «اسحب للإلغاء» / «Slide to cancel»
  - started «بدأ التسجيل» / «Recording started»
  - cancelled «أُلغي التسجيل» / «Recording cancelled»
  - delete «احذف التسجيل» / «Delete recording»
  - micBlocked «اسمح للتطبيق باستخدام الميكروفون من الإعدادات لتسجيل رسالة صوتية» / «Allow microphone access in Settings to record a voice message»
  - failed «لم تُرسل الرسالة الصوتية، فأعد المحاولة» / «The voice message was not sent. Try again.»
- Reuse calls.mic.openSettings.

9. ACCESSIBILITY
- Every control is ≥44pt and labelled; the icons are hidden from screen readers.
- TalkBack order follows the logical layout.
- Mic:
  - accessibilityActions [{name:'activate'}]. onAccessibilityAction, and a plain onPress while AccessibilityInfo.isScreenReaderEnabled, starts a LOCKED recording: TalkBack users never need hold-and-slide.
  - In the locked bar, Delete and Send are separate labelled buttons.
  - AccessibilityInfo.announceForAccessibility on start, cancel, sent and failed. The timer is not a live region (it would chatter).
- Sighted users: a short tap on the mic (release < MIN_MS without recording) shows the hint line.
- Reduce motion: no blink, no scale or crossfade, no lock-badge animation.
- The red dot is never the only signal: the timer and the announcement carry the state.

10. TESTS (jest-expo)
Rewrite these tests and add these new ones next to the code:
- composer/Composer.side.test.tsx (RTL, default jest.setup):
  - open-row leftToRight(row, true) = [round-action, camera, attach, input, emoji]
  - closed-row = [sendTemplate, closed-note, quote-button, savedReplies]
- composer/Composer.side.en.test.tsx (mock isRTL:false): the reverse, with English strings.
- Composer.layout.test.tsx:59-64: the 44pt arithmetic now includes the pill border.
- RoundAction tests: empty → mic; text → send; staged → send; teacher → send always; voiceSupported false → send.
- voice-machine.test.ts and voice-drag.test.ts: cancel and lock thresholds for rtl true and false; micShift clamps to the start side.
- MicHold.test.tsx with expo-audio mocked:
  - permission denied → no record() call
  - blocked → micBlocked line
  - too short → discard
  - cancel in RTL (dx>0) and in LTR (dx<0)
  - lock
  - release → sendChatFile called with mime 'audio/mp4', filename 'voice.m4a' and replyToMessageId
  - failure keeps the recording and a retry reuses the same id
- EmojiSheet: inserts at the caret.
- CameraButton: hidden while typing, absent in teacher mode.
- app-config.test.ts:11-16: title and comment updated after the owner's go. The prop values are unchanged.

11. SHIPPING
- OTA (EAS Update on the 0.3.0 runtime; never reaches 0.2.0 because runtimeVersion is appVersion, app.json:66-68): everything in §1-§9, including recording, because the expo-audio recorder and RECORD_AUDIO (declared by the webrtc plugin) and the camera are already in APK 0.3.0.
- API deploy, done FIRST, because the app's audio/mp4 upload is otherwise refused with 400 file_type:
  - shared CHAT_FILE_MIMES, the schema and the sniff.
  - Tier B ffmpeg transcode (m4a → ogg/opus mono) with the voice:true flag, and the messageLabel fix.
  - The Dockerfile apt-get gains ffmpeg; the image is rebuilt.
  - Without ffmpeg the API falls back to sending the m4a as basic audio.
- Native build: NOT required.
  - Optional at the next APK: recordAudioAndroid:true; expo-haptics for the record-start tick; a camera rationale string that is not about receipts (app.json:44, iOS only).
  - iOS is not built.
- Owner sign-off list: recording (reverses 2026-10-19 «never records»), ffmpeg in the API image (Tier B vs Tier A), template / quick replies / quote moving into the attach sheet, the curated emoji sheet vs a picker dependency, and the English-phone LTR default from the RTL plan.

### Voice notes — feasibility

- **feasible_in_apk_030**: YES. Voice recording can ship by OTA to APK 0.3.0 with no native build. The evidence chain:
(1) The expo-audio config plugin (expo/expo sdk-57 packages/expo-audio/plugin/src/withAudio.ts) uses `recordAudioAndroid` only to build the list it passes to AndroidConfig.Permissions.withPermissions: `recordAudioAndroid !== false && 'android.permission.RECORD_AUDIO'`, then .filter(Boolean). It never calls withBlockedPermissions and never writes tools:node="remove". So `recordAudioAndroid:false` (apps/mobile/app.json:52-53) only leaves RECORD_AUDIO out of expo-audio's own list.
(2) @config-plugins/react-native-webrtc (expo/config-plugins packages/react-native-webrtc/src/withWebRTC.ts) adds RECORD_AUDIO through withPermissions, and it is in app.json:58-64.
(3) The only blocked permission is SYSTEM_ALERT_WINDOW (app.json:23; asserted by apps/mobile/src/app-config.test.ts:23-25). So the merged 0.3.0 manifest declares RECORD_AUDIO.
(4) The recorder native code (sdk-57 android/.../AudioRecorder.kt, AudioRecords.kt, AudioModule.kt) is compiled into the expo-audio ~57.0.5 module whatever the plugin props are. useAudioRecorder, useAudioRecorderState, RecordingPresets and requestRecordingPermissionsAsync are plain JS over that module (ExpoAudio.ts). On Android, requestRecordingPermissionsAsync requests RECORD_AUDIO.
(5) The camera works the same way: expo-image-picker (app.json:41-48) and the webrtc plugin declare CAMERA, and pickReceipt('camera') already uses it (apps/mobile/src/payments/receipt.ts:53-60).

Runtime traps from AudioRecorder.kt:
- setRecordingOptions() RETURNS EARLY when hasRecordingPermissions() is false. The MediaRecorder is then left unconfigured, record() does nothing useful and stop() has no url. So await requestRecordingPermissionsAsync() (or the PermissionsAndroid path of apps/mobile/src/inbox/thread/calls/rtc/native-rtc.ts:8-13) BEFORE prepareToRecordAsync(), then check status.canRecord before record().
- stop() releases the MediaRecorder, so every new recording needs prepareToRecordAsync() again.
- The foreground service (useForegroundService / enableBackgroundRecording) is not needed; recording stops when the app goes to the background.
- setAudioModeAsync's allowsRecording is iOS-only, and iOS is not built.

Phones on APK 0.2.0:
- runtimeVersion policy 'appVersion' (app.json:66-68; app-config.test.ts:28 says «an OTA never reaches the 0.2.0 APK») means a bundle published from the 0.3.0 config is never delivered to 0.2.0. Those phones keep today's composer with no mic, so the graceful-degrade requirement is met by runtime targeting.
- If the team ever also publishes for a 0.2.0 runtime, gate the mic on the native runtime (expo-updates `Updates.runtimeVersion` >= 0.3.0; expo-updates is a dependency). Do NOT gate on a permission probe: a permission blocked in the manifest answers denied/never_ask_again, exactly like a user's permanent «don't ask again».
- Also keep a defensive voiceSupported(): Platform.OS==='android' and expo-audio's AudioModule.AudioRecorder is a function, wrapped in try/catch like native-rtc.ts:16-20 load(). If it is false, the round button is always SEND (disabled while empty).
- A user's permanent deny: the mic stays, and a tap shows «اسمح باستخدام الميكروفون من الإعدادات» with «افتح الإعدادات» (Linking.openSettings()).

Owner go still required:
- The owner said on 2026-10-19 «expo-audio plays voice notes, it never records» (app-config.test.ts:4). The comment and test title at :11 become stale; the prop itself stays false.
- Recording depends on the webrtc plugin keeping RECORD_AUDIO declared. At the next APK, set recordAudioAndroid:true so recording does not hang on the calls plugin.
- **format**: WHAT ANDROID CAN RECORD THROUGH expo-audio 57
- The Android enums (sdk-57 src/Audio.types.ts; android AudioRecords.kt) are:
  - AndroidOutputFormat = 'default' | '3gp' | 'mpeg4' | 'amrnb' | 'amrwb' | 'aac_adts' | 'mpeg2ts' | 'webm'
  - AndroidAudioEncoder = 'default' | 'amr_nb' | 'amr_wb' | 'aac' | 'he_aac' | 'aac_eld'
- There is NO 'ogg' output format and NO 'opus' (or vorbis) encoder, although Android's MediaRecorder has OutputFormat.OGG and AudioEncoder.OPUS from API 29. The Kotlin enums reject unknown strings, and strict TS would not allow them anyway.
- 'webm' is unusable: without an opus/vorbis encoder there is nothing the WebM muxer accepts.
- What OTA can produce on Android:
  - .m4a = MPEG-4/AAC (RecordingPresets.HIGH_QUALITY android: mpeg4 + aac, 44.1 kHz, stereo, 128 kbps). Best option.
  - .3gp/AMR-NB (LOW_QUALITY).
  - .aac ADTS.
- Spec for voice: { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 48000, isMeteringEnabled: true }. That is mono AAC at about 360 KB per minute, so a 10-minute cap (MAX_MS) is about 3.6 MB, under the 10 MB default academy limit (useUploadMaxBytes) and Meta's 16 MB. The mime is 'audio/mp4' and the file is named voice.m4a.
- expo-audio 57 also has AudioStream.kt (mic PCM streamed to JS), but encoding Opus in JS on the phone is not worth it.

WHAT WHATSAPP NEEDS (Meta Cloud API audio-messages doc)
- Supported audio types: AAC audio/aac, AMR audio/amr, MP3 audio/mpeg, MP4 audio audio/mp4 (.m4a), and OGG audio/ogg («OPUS codecs only; base audio/ogg not supported; mono input only»). The limit is 16 MB each.
- A VOICE message = type 'audio' with audio:{link|id, voice:true}, and the file MUST be .ogg OPUS. It then shows the business avatar with a mic icon, downloads automatically and can be transcribed. The play icon appears only when the file is 512 KB or smaller; larger voice notes show a download icon first.
- Any other format, or voice omitted, is a BASIC audio message: a music icon and a download icon (an OGG/OPUS file sent as basic audio still gets the mic icon). 360dialog documents that voice:true is ignored for non-ogg/opus files.
- Kapso's proxy takes the same body (docs.kapso.ai audio: `audio:{id, voice:true}`, «Must be .ogg files with OPUS codec»; no conversion).
- The CRM driver sends only image or document (apps/api/src/modules/messaging/whatsapp/drivers/crm/crm-body.ts:79-88). On a CRM line a recording can never be a voice note: it arrives as a file.

SO, IS TRANSCODING NEEDED? Yes, for a true WhatsApp voice note. Two tiers:
- Tier A (no transcode; OTA + small API change): send the m4a as basic audio/mp4. The family gets a playable audio file with a music icon, not a voice bubble.
- Tier B (recommended; this is what the owner's «same experience» means on the family's side): the API transcodes m4a to ogg/opus mono with ffmpeg and sends voice:true.
  - Command: `ffmpeg -hide_banner -loglevel error -i in.m4a -vn -ac 1 -ar 48000 -c:a libopus -b:a 24k -application voip out.ogg`.
  - At 24 kbps, the 512 KB play-icon threshold is about 170 s.
  - Use a TEMP FILE, not stdin: Android's MPEG4Writer puts the moov box at the end, so an MP4 piped into ffmpeg fails.
  - ffmpeg is not in the API image today (apps/api/Dockerfile:13-25: node:24.15.0-slim plus Chromium and fonts). Add `ffmpeg` to the runtime-stage apt-get line (Debian's ffmpeg is built with libopus). The image grows; the alternative is the ffmpeg-static npm binary.
  - If ffmpeg is missing or fails, fall back to Tier A, so the feature works before the image is rebuilt.
- **server_path**: TODAY'S SEND-A-FILE PATH
- Mobile:
  - pickChatFile (apps/mobile/src/inbox/composer/send-file.ts:52-58) and AttachFile (composer/AttachFile.tsx:73-86).
  - sendChatFile (send-file.ts:75-93): chatFileProblem at :76, then POST /threads/:phone/file-upload-url {clientRequestId, mime, size} at :78-82, then supabase.storage.uploadToSignedUrl(bytes ArrayBuffer, contentType) at :83-86, then POST /threads/:phone/file {clientRequestId, path, filename, replyToMessageId?} at :87-92.
  - useSendFile (:96-105) appends the row.
- API:
  - ThreadFileSendController (apps/api/src/modules/messaging/inbox/files/thread-file-send.controller.ts:31-49) uses permission inbox.send. A teacher gets 403 files_forbidden (:51-55).
  - ThreadFileSender.uploadUrl (thread-file-send.service.ts:56-61) runs assertSendable, the window/line check and chatOutPath, then signs an upload into wa-media.
  - ThreadFileSender.send (:69-94) checks the path, runs storage.info and assertSendable, sniffs the first 12 bytes (:80-82), then outbox.send with media_path, media_mime and media_name.
  - The dispatcher sends by link: message.dispatch.ts:103-108 picks the kind with waSendKind (shared chat-files.ts:20-34, where 'audio/mp4' and 'audio/ogg' map to 'audio'). The Meta and Kapso body comes from mediaMessage (whatsapp/messages/wa-components.ts:106-112, no caption on audio); the CRM body from crmMediaBody.

EVERY GATE THAT REFUSES AUDIO TODAY
(a) Mobile send-file.ts:76 runs chatFileProblem (packages/shared/src/messaging/chat/chat-files.ts:42-47) against CHAT_SEND_MIMES = jpeg/png/pdf (:6), which gives file_type.
(b) packages/shared/src/messaging/schemas.ts:24: threadFileUploadSchema.mime = z.enum(CHAT_SEND_MIMES).
(c) thread-file-send.service.ts:22-26 assertSendable (the same chatFileProblem).
(d) thread-file-send.service.ts:82 `sniffMime(head) !== mime`. apps/api/src/modules/teaching/booking/invoice/invoice-sniff.ts:7-17 recognises only jpeg/png/pdf/webp/heic, so audio would be refused even after the lists grow.
(e) There is no voice flag: whatsapp.types.ts:56-63 MediaSend has no `voice`, and wa-components.ts:110-111 never emits it.

ALREADY FINE
- The wa-media bucket allows audio/ogg and audio/mp4 up to 16 MiB (packages/db/supabase/migrations/20261019000500_wa_media_audio_video.sql:3-8).
- apps/api/src/common/storage/storage.paths.ts extFor maps audio/mp4 to m4a and audio/ogg to ogg (:27-46), and chatOutPath (:95-97) uses it.
- replyToMessageId already flows (send-file.ts:91).
- Our own bubble plays both mimes: MessageFile.tsx:92-93 shows VoiceNote for playable audio (shared schemas/chat-media.ts:6-8).

WHAT MUST CHANGE (deploy the API BEFORE the OTA, or the app's audio/mp4 upload gets 400 file_type)
1. chat-files.ts:
   - Add `CHAT_VOICE_MIME = 'audio/mp4'` and `CHAT_FILE_MIMES = [...CHAT_SEND_MIMES, CHAT_VOICE_MIME]`.
   - chatFileProblem checks CHAT_FILE_MIMES; audio's cap is maxBytes.
   - Do NOT add audio to CHAT_SEND_MIMES: it is also the saved-reply attachment enum (shared messaging/replies/saved-replies.ts:70; api saved-replies.mapper.ts:20) and the web attach list (apps/web/.../composer/components/AttachButton.tsx), which would widen silently.
2. schemas.ts:24: z.enum(CHAT_FILE_MIMES).
3. invoice-sniff.ts FORMATS, after the HEIC entry:
   - ['audio/ogg', b => ascii(b,0,4)==='OggS']
   - ['audio/mp4', b => ascii(b,4,8)==='ftyp' && !HEIC_BRANDS.has(ascii(b,8,12))]
   - Invoices still refuse these, because they compare against their own list.
4. Tier B: new apps/api/src/modules/messaging/inbox/files/voice-ogg.ts (≤150 lines). toVoiceOgg(bytes, run = spawnFfmpeg) writes os.tmpdir() files, runs ffmpeg (the args above) with a 30 s timeout, returns the ogg bytes or null, and always removes the temp files. The runner is injected so tests need no ffmpeg.
5. In ThreadFileSender.send, right after the sniff at :82 and before outbox.send at :84, when mime==='audio/mp4':
   - storage.download(ref), then toVoiceOgg.
   - On success, storage.upload({bucket: waMedia, path: `out/{actor}/{request}/voice.ogg`, body, contentType: 'audio/ogg'}). Use that FIXED name and an upsert, so a replay overwrites the same object.
   - Then send with media_path = the ogg path, media_mime 'audio/ogg', media_name 'voice.ogg'. On null, send the m4a unchanged (Tier A) and log a warning.
   - KEEP the m4a. A replayed clientRequestId runs storage.info(path) at :76-77 before the outbox dedup, so deleting it would turn a replay into 400 file_path instead of the first row.
   - Extract a helper if the method passes 150 lines.
6. MediaSend: add `voice?: boolean`.
   - message.dispatch.ts:105-107 passes `voice: baseMime(row.media_mime) === 'audio/ogg'`. This also makes forwarded family voice notes (ogg/opus) arrive as voice notes, which is correct.
   - wa-components.ts:111 adds `...(kind === 'audio' && input.voice ? { voice: true } : {})` inside [kind].
   - Kapso takes the same body. The CRM driver stays document-only (crm-body.ts:80-88): flag it.
7. send-plan.ts:133 messageLabel uses waMediaKind, which labels audio «ملف». Use waSendKind so ar.inbox.media.audio «رسالة صوتية» is shown.
8. apps/api/Dockerfile:20-23: add ffmpeg to the runtime apt-get install.
9. Tests (Vitest, next to the code):
   - chatFileProblem: audio/mp4 accepted, and saved replies are still image/PDF only.
   - sniff: OggS, ftyp, and HEIC still HEIC.
   - voice-ogg with a fake runner: args include -ac 1 and -c:a libopus; a failure returns null.
   - Service: m4a becomes an ogg row; without ffmpeg an m4a row; a replay returns the first row.
   - mediaMessage: voice only for an audio/ogg row.
   - messageLabel for audio.
   - WhatsApp tests only with Meta test credentials and the allow-list, never Kapso or real families.
- **risks**: 1. OWNER DECISIONS
- The owner said on 2026-10-19 that expo-audio «never records». Recording reverses that, so it needs his go; the app-config.test.ts:4,11 comment and title must change.
- The ffmpeg image change, the Tier A vs B choice, and moving template, quick replies and quote into the attach sheet are also his call.
- The RTL plan's English phone switching to English and LTR needs the same sign-off.

2. RECORDING DEPENDS ON THE CALLS PLUGIN
- RECORD_AUDIO reaches the manifest only through @config-plugins/react-native-webrtc. If that plugin is removed, recording fails as «denied / don't ask again».
- Fix at the next APK: recordAudioAndroid:true.

3. SILENT RECORDER FAILURE
- AudioRecorder.kt skips configuring the recorder when the permission is missing. Always request first, prepareToRecordAsync, then check canRecord, then record(); prepare again after every stop().

4. SERVER
- Deploy the API before the OTA (gates (a)-(d) in server_path).
- An MP4 with its moov box at the end cannot be piped into ffmpeg: use a temp file.
- Replay idempotency: keep the m4a, and write the ogg to a fixed path with upsert.
- The ogg must be mono (Meta).
- The voice play icon only shows up to 512 KB, about 170 s at 24 kbps; longer notes show a download icon first.
- The CRM driver turns audio into a document (no voice note on that line).
- The Docker image grows with ffmpeg.

5. CONFLICTS AND INTERRUPTIONS
- The mic and in-app WebRTC calls compete: stop the recording when a call starts, and do not offer the mic during a call.
- Background mic access needs a foreground service we do not have: stop and keep the recording on AppState 'background'.
- Gesture conflicts with the FlatList scroll, SwipeReply and the keyboard: use the responder pattern of Waveform.tsx:59-66 with onResponderTerminationRequest → false. There is no gesture-handler or reanimated in the APK, so use RN Animated only.
- Pause any playing voice note when recording starts (claimPlayback from playback.ts).

6. ACCESSIBILITY
- Hold-and-slide is gesture-only. The tap-to-toggle locked mode for TalkBack is required, not optional.

7. DEVICE CHECKS NEEDED
- Android TextInput alignment after removing textAlign (ReactTextInputManager.kt:560 vs :1037 paths): confirm Arabic typed on an English phone runs right-to-left, and the placeholder alignment.
- Measure recording size and length on a real device.

8. TESTING POLICY
- No local test or build runs on the owner's PC: CI or cloud routines only.
- WhatsApp sends only with Meta test credentials and the allow-list; never send via Kapso; no real families.

9. NO HAPTICS
- No haptics in this OTA: expo-haptics is not in the APK, and RN Vibration needs the VIBRATE permission, which was not verified.

### Gaps vs WhatsApp

| Feature | WhatsApp | Ours | Action |
|---|---|---|---|
| Composer anatomy | One rounded pill [emoji / input / paperclip / camera] plus a round button outside the pill at the end | Six separate 44pt controls in a physical row [template][quick replies][quote][clip][bordered input][send] (threads-list/OpenRow.tsx:37-48) | New ComposerPill (plain 'row', radius pill, border on the pill) + RoundAction. The input loses its own border. Template, quick replies and quote move into the attach sheet (see spec §4). |
| Direction follows the phone, mirrored in RTL | LTR on an English phone, fully mirrored on an Arabic phone: in Arabic the round button is on the left and the emoji on the right | physicalRow pins physical left-to-right order in both directions (shared/physical-row.ts:15-19; OpenRow.tsx:37; ClosedRow.tsx:16), so send is always on the right | flexDirection 'row' with children in reading order. Delete physicalRow from OpenRow and ClosedRow (ChatHeader too, per the RTL plan). Rewrite Composer.side.test.tsx and add Composer.side.en.test.tsx. |
| Send arrow | Mirrored in RTL | SendIcon never mirrored; its comment pins it to the physical right (shared/chat-icons.tsx:36-57) | Wrap it in View transform scaleX(isRTL ? -1 : 1), as ReplyIcon does (:100-104), and fix the comment |
| Mic / send morph | Round button = MIC while the input is empty, SEND once there is text | Always a send button; nothing happens on empty text unless a staged file exists | RoundAction shows MicIcon when text.trim()==='' && !staged && voiceSupported && !teacher, else SendIcon. Same Pressable, the label switches, 120 ms crossfade (none when reduce motion is on). |
| Hold-to-record voice note | Press and hold the mic to record (timer, red dot, live level); release to send | None. expo-audio is used for playback only. | Record m4a/AAC mono with the expo-audio 57 recorder (OTA into APK 0.3.0). Upload through the existing file-send path as audio/mp4. The server turns it into a voice note (voice section). |
| Slide to cancel | Slide toward the start edge past a threshold to discard (left in LTR, right in RTL) | None | Pure voice-drag.ts: towardStart = dx * (isRTL ? 1 : -1); cancel when towardStart > max(100, 0.35 * screen width). Hint text with <Chevron to='prev'>; the mic follows the finger with physical translateX clamped to the start side. |
| Slide up to lock | Drag up past a threshold for hands-free recording; then trash, timer and send are shown | None | Lock when -dy > 80 and not cancelled. The locked bar is [Trash][dot + timer][level bars] in the pill and SEND in the round button. |
| Voice note arrives as a WhatsApp voice note | audio/ogg OPUS mono with audio.voice=true: mic icon, auto-download, transcription | Gates refuse audio: shared CHAT_SEND_MIMES (packages/shared/src/messaging/chat/chat-files.ts:6), schemas.ts:24, invoice-sniff.ts:7-13. mediaMessage has no voice flag (wa-components.ts:106-112). | Accept audio/mp4 from chat sends. Sniff OggS and ftyp. Transcode m4a to ogg/opus mono with ffmpeg in the API (Tier B). Send voice:true for audio/ogg. |
| Emoji button | Opens WhatsApp's own emoji/sticker/GIF panel | None; no emoji library in the APK | JS-only EmojiSheet with a curated static grid, inserted at the caret. Stickers/GIF are skipped: WhatsApp stickers are webp and we cannot send them. |
| Camera in the pill | Camera icon at the end of the pill, hidden while typing | Camera exists only for payment receipts (payments/receipt.ts:53-60) | ChatFileSource += 'camera' and pickChatFile('camera') calls pickReceipt('camera'), with ensureCameraPermission. Staff only; hidden when the text is non-empty. |
| Attach sheet | Paperclip opens a grid of round tiles (Document, Camera, Gallery, Audio, … ; WhatsApp Business adds Quick replies, Catalog) | A three-button sheet: image, PDF, cancel (AttachFile.tsx:21-50) | Grid of round tiles with labels: «المعرض», «الكاميرا», «مستند PDF», «قالب», «الردود السريعة» (staff), «عرض سعر» (pricing.read). Logical row with wrap, so it mirrors. |
| Text input direction | Aligns and orders by what is typed (Arabic on an English phone runs right-to-left) | textAlign 'left' forced (ComposerInput.tsx:44) | Remove textAlign. EditText then follows the first strong character. Verify on a device build. |
| Photo preview with caption before sending | The picked photo opens a preview with a caption field | Sends immediately with no caption (AttachFile.tsx:77-81); captionPlaceholder exists in i18n but is unused on mobile | Out of scope for this change. Add later: the API already accepts caption (schemas.ts:34). |
| Recording haptics | A short vibration when recording starts or is cancelled | None; expo-haptics is not in the APK | Skip for the OTA. Add expo-haptics at the next native build. |
| Screen-reader recording | With TalkBack: double-tap the mic to start, double-tap again to stop and send | Not applicable | accessibilityActions 'activate' (and a plain tap while a screen reader is on) starts a LOCKED recording with explicit Delete and Send buttons; announceForAccessibility on start, cancel and sent |
| Interrupted recording | Kept as a draft voice note in the chat | Not applicable | On AppState background, a lost responder or MAX_MS: stop and keep it as a stopped recording (locked bar: delete/send). On leaving the chat: discard (ponytail: no per-chat voice drafts). |
| 24 h window closed / templates only | No equivalent (consumer app) | ClosedRow: ClosedNote + «أرسل قالبًا», reopen note, restricted allow-list on the server | KEEP unchanged except a logical 'row' (mirrors), with «أرسل قالبًا» at the end where the round button sits. No pill, no mic. |
| Teacher mode | Not applicable | Template + text + send; files refused by the API (403 files_forbidden) | Pill = [emoji][input][TemplateIcon]. The round button is always SEND (disabled while empty): no mic, camera or clip. |

## Risks

- Existing installs persisted RCTI18nUtil_forceRTL=true. On the first boot after the OTA, English phones with nothing saved reload once more to clear it. That is expected, not a loop: the RELOAD_KEY marker guards it.
- expo-localization's native module must be in the APK runtime the OTA targets. getLocales() is wrapped in try/catch, falling back to 'ar', so boot never breaks. Under jest it is mocked globally, because jest-expo ships no ExpoLocalization mock.
- Android TextInput alignment after removing textAlign cannot be proven in jest, because the prop path at ReactTextInputManager.kt:560 and the state path at :1037 behave differently. It needs a device check after the OTA: Field (44 call sites in one PR), ComposerInput, ReportTextField, the OTP and amount caret, and the placeholder alignment.
- Android's first-strong check skipping isolated text (isolate()/ltr() in work-text, activity and trial lines) is only proven on a device. Jest only proves the marks are present.
- Mixed chat layout if an OTA ships between merges. The single-OTA rule covers it, but the fast lane's auto-merge plus 'trigger OTA myself' makes that rule easy to break, so state it in every package's routine prompt.
- Merge-order coupling: C deletes inbox/shared/physical-row.ts, which ChatHeader (T) imports. If C rebases before T has merged, its typecheck fails. Guard it with the grep check and keep the order T → C.
- Recording depends on RECORD_AUDIO, which reaches the manifest only through @config-plugins/react-native-webrtc (recordAudioAndroid stays false). Removing that plugin turns the mic into a permanent 'denied'. Set recordAudioAndroid:true at the next APK.
- AudioRecorder.kt silently skips configuring the recorder when permission is missing. The sequence request → prepare → canRecord → record must hold, with prepare repeated after every stop.
- On the CRM driver line a voice note arrives as a document (crm-body.ts:79-88). The voice:true play icon shows only up to 512 KB (about 170 s at 24 kbps). ffmpeg grows the API image. If ffmpeg is missing or fails, the API falls back to plain m4a audio (Tier A).
- C changes what reaches families (voice, camera, emoji text). It needs the owner's review before merge, and WhatsApp sends only with Meta test credentials and the allow-list: never through Kapso, never to real families.
- Gesture conflicts between hold-and-slide on the mic and FlatList scroll, SwipeReply and the keyboard. Gesture-handler and reanimated are not in the APK, so only RN Animated and the responder are available. TalkBack's tap-to-lock recording is required, not optional.
- A phone-language change applies on the next cold start only (syncLocale runs in the root gate). Once «اللغة» is saved there is no 'follow the phone' option. That was skipped on purpose; add a third «لغة الهاتف» choice in LanguageRow if asked.
- CI only: no local tests or builds on the owner's PC. The fast lane's affected-only verify is effectively the full mobile suite for F, because core/ui and core/lib are imported everywhere.
