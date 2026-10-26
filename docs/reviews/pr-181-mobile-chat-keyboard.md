# Review of PR #181 — mobile chat: composer above the keyboard + clear text for unavailable messages

Independent adversarial review by the cloud feature shepherd. Lenses: Android edge-to-edge keyboard
geometry in all three chat route groups + JS-only check; data / side effects of the new copy (every
consumer of `inbox.media.other`, push preview, webhook payload shape); MSA Arabic + en parity, UI
(heuristic-evaluation, design-qa-checklist, critique-brand-consistency); repo rules.

## Keyboard (no Critical / Important)

- `(admin-chat)`, `(sales-chat)` and `(teacher-chat)` all re-export the same ThreadScreen; every
  stack has `headerShown: false`, no tab bar, nothing above `<Screen chat>`, whose body starts at
  the top inset — so `keyboardVerticalOffset = insets.top` is exact. ChatHeader / SubscriptionPanel
  sit in the same parent and are already counted in `frame.y`. ReportFormScreen and login checked
  the same way; no `KeyboardAvoidingView` with `'height'` is left in `src` or `app`.
- JS-only: `node tools/scripts/native-changes.mjs c140b4cc` → «no native change: an OTA update is
  enough».
- Tests run the real KeyboardAvoidingView (the 40pt offset is load-bearing: 260 ≠ 300).
- Minor, not fixed: split-screen / Stage Manager (window not at the screen's top) would under-pad
  by the window's offset — same limit as React Native itself; the app is portrait-only.
- Minor, not fixed (predates the PR): `ForwardSheet` / `NewChatSheet` modals do not avoid the
  keyboard.

## Copy (2 Important, fixed)

1. **Important — fixed.** `packages/shared/i18n/ar.json` `inbox.media.other` became «لم يصل محتوى
   هذه الرسالة من واتساب — اطلب من المرسل إعادة إرسالها», but that key is also the fallback for
   inbound rows that DID arrive with no body/file: a location, a contact card, a reaction (web
   bubble `MessageContent.tsx`, list preview `format.ts:55`, quotes `quote.ts:28`, mobile
   `message-text.ts`, `quote-text.ts:35`). Scenario: a guardian shares a location → staff read that
   it never arrived and ask them to resend it. Fix: `inbox.media.other` is neutral again («رسالة لا
   يمكن عرضها هنا»); the resend sentence moved to a new key `inbox.unsupported`, shown only for
   Meta's `type: 'unsupported'` (new `isUnsupportedMessage` in `packages/shared`), 131060 keeps
   `inbox.unavailable`. Web and mobile share the logic.
2. **Important — fixed.** `apps/api/src/modules/messaging/webhook/inbound/webhook.inbound.ts` `pushPreview`: every
   type without a label (contacts, reaction, interactive) became «أرسل رسالة لم يصل محتواها» — false
   for those. Now only `type === 'unsupported'` says so; the others read «أرسل رسالة لا يمكن عرضها
   هنا». Tests updated (reaction, location, unsupported).
3. Minor, not fixed: for 131060 the thread-list snippet and quotes show the neutral line, the
   bubble the 131060 sentence (the list has no payload). Acceptable: the long sentence would be
   truncated in a list anyway.
4. Minor — fixed: the docstring above `pushPreview` quoted dialect («بعت»).

ar/en key sets are in parity; copy is Modern Standard Arabic. Repo rules: every changed file ≤ 150
lines, ≤ 3 params, no `any` / `!`, tests next to the code, no personal data.

Verified locally: `pnpm i --frozen-lockfile`, `pnpm --filter @ab/db --filter @ab/shared build`,
full `pnpm turbo lint typecheck test` (29/29). Not checked on a real device (still to do after the
OTA).
