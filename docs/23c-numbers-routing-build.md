# 23c — Phase 5 «التوجيه لكل رقم»: build contract

Build notes for docs/23 §3 phase 5 (branch `cloud/numbers-routing`). Owner answer 1 (2026-10-22): any number
of live numbers; each template and each notification row picks its number; replies follow the number the
family wrote to. The shared contract is code: `packages/shared/src/numbers/routing.ts` (`routeTemplate`,
`routeSession`, `roleOrder`), `packages/shared/src/messaging/replies/reply-number.ts` (`replyNumber`, `mergeWindows`);
migration `packages/db/supabase/migrations/20261024000633_numbers_routing.sql`.

## Decisions

1. **Behind the flag, byte-identical under legacy.** Every new path runs only while
   `settings.comms_source = 'module'` (the numbers overlay is installed). Under `legacy` (the default and
   staging's value) the sender, the webhook and the inbox take today's code path: `lineOf()`, `replyLine()`,
   the two line clients, `lineFor()`. Tests pin that the legacy path makes no new read.
2. **Schema (expand only).** `message_templates.number_id` (null = the role's default), `wa_numbers.fallback_rank`
   (0–999, default 100), `message_template_numbers(template_key, number_id)` approvals (RLS admin read,
   service role write), view `v_thread_numbers(phone_e164, number_id, line, last_inbound_at)` (service role only; `number_id` null = a line's unstamped history).
   `v_threads` is unchanged; `notification_rules.number_id` already exists (632). No row is inserted and
   `settings` is never read or written.
3. **Template routing order** (`routeTemplate`): the catalogue row's number (the first non-manual catalogue
   entry whose `templates` lists the key; its `notification_rules.number_id`) → `message_templates.number_id`
   → the role's default number (`purpose = message_templates.line`) → the role's other numbers by
   `fallback_rank`, then `created_at`. A candidate is skipped when it is disabled, cannot send (no working
   credentials; a number never borrows another number's token) or the template is not approved on it.
   None left → the row stays queued, untouched (fail closed, as an unconfigured line today). An unreadable
   approvals, templates or rules table aborts the pass (rows wait); it never routes without the rule.
4. **Approval on a number.** A `message_template_numbers` row with `status = 'approved'`; with no row yet, the
   role's default number counts as approved when `message_templates.status = 'approved'` (that is what the
   per-line sync checked: the default's WABA is the role's WABA in module mode). Any other number needs its
   own synced row. The per-number sync reads that number's WABA list and writes the result to every number
   sharing its `waba_id` (one Meta template per WABA).
5. **Session texts and files** (`routeSession`): the number stamped at enqueue (`messages.number_id`), else
   the default of the row's line. Never a fallback: a session message is valid only inside that number's
   window. A row that cannot leave stays queued.
6. **Reply windows** (`replyNumber`): windows from `v_thread_numbers`; only its unstamped rows (history before
   the flip) count for their line's default number, so an inbound on a second number never opens a window on
   the default (review fix; `v_threads` line columns are not used because they include stamped rows). The open window with the
   newest inbound whose number can send wins; open windows only on numbers that cannot send → 503
   `line_not_configured` (unchanged code); none open → 409 `session_closed`. The inbox stamps
   `number_id` and `line = purpose` at enqueue.
7. **Inbound** (module mode): the webhook accepts a change whose `phone_number_id` is any `wa_numbers` row
   (enabled or not: «off = no sends, inbound still logged»), stamps `messages.number_id` and
   `line = purpose`; an unknown id is ignored as today. The signature is checked against every number's app
   secret (Vault), never a legacy key under module mode.
8. **Claim.** The worker stamps `number_id` (always, module mode) and `line = purpose` of the chosen number.
   A broken token pauses that NUMBER for the pass (legacy: the line).
9. **Admin.** `PATCH /admin/numbers/:id` accepts `fallback_rank`. `PUT /messaging/templates/:key/number`
   `{ number_id: uuid | null }` (templates.manage; 404 unknown number; audited). `POST /admin/numbers/:id/templates/sync`
   (templates.manage) runs the per-number sync. `GET /messaging/templates` items gain `number_id` and
   `numbers[]` (additive; the 0.2.0 phone ignores them). Web: a number select and per-number approval chips in
   «القوالب»; «ترتيب البديل» on the number card. Mobile: no change in this phase.

## Review (2026-10-24, fresh-context reviewers)

- Send gate / fail-closed / legacy parity: legacy path verified unchanged; fixed (1) reply windows credited a
  second number's inbound to the default (now unstamped history only, `inbox/send-number.ts` `numberWindows`),
  (2) a failed rules read routed without the rule (now aborts the pass, `whatsapp/number-routes.ts`).
- Data loss / migration / old phones: module mode with no number rows keeps inbound unstamped instead of dropping
  it (`webhook/webhook.lines.ts`); the template list survives a missing approvals table (deploy order); API
  changes additive; `native-changes` says no native change; `owned-keys-check` clean. The partial index on
  `messages` is built inside the migration's transaction (same pattern as 620): apply it at a quiet time.
- Design: «يُرسل من» shows «رقم غير معروف» for a number missing from the list, marks stopped numbers, a visible
  label on phones, busy-safe dialog, «ترتيب البديل» error on blur, MSA wording without number agreement.
- Known limits (module mode only, documented, not changed): `due()` still filters chat-stamped texts by the
  chat role's default being configured; `SendGate.open()` still needs the notifications default configured.

## ربط كل رسالة برقمها — design note (2026-10-25, NOT built)

Under `comms_source = legacy` the app stamps only `messages.line`; `number_id` stays null (a chat message of
2026-10-25 02:56Z had none). Nothing reads `number_id` under legacy (every reader is gated on
`overlayNumbers()` / `activeNumberId()`), so linking it changes nothing until the flip to module mode, and
there it decides reply windows (`v_thread_numbers` → `numberWindows`) and session routing (`routeSession`).

**Tried and dropped (review 2026-10-25):** a BEFORE INSERT / UPDATE OF line trigger on `messages` setting
`number_id` = the one enabled `wa_numbers` row whose `purpose` = `line`. Legacy sending stayed byte-identical,
but the stamp guesses from the ROLE, not from the phone the message really used: legacy picks the line from
the env / integration_config phone ids (`webhook.lines.ts` `lineFor`), and nothing keeps `wa_numbers` in step
with them (a spare enabled, the real number disabled, a phone swap before the flip). Reproduced: an inbound on
the env chat number got stamped with an enabled spare; after the flip its window credits the spare and the
inbox reply leaves from a number the family never wrote to (Meta 131047), where a null stamp would have been
credited to the default correctly. A wrong stamp is worse than none.

**Safe design (a later PR, its own review):** stamp by phone id, never by role.
- Inbound (legacy webhook): `wa_numbers.phone_number_id = metadata.phone_number_id` of the change (already
  parsed, `webhook.parse.ts`); no row → null.
- Outbound (legacy claim): the row of `lineNumbers(env)[line]`, the phone id the line client really sends
  from; no row or no line → null. Only the stamp is added to the claim's update; the line, the client, the
  gate and the window logic stay as they are, pinned by the existing legacy tests plus one per writer.
- Never touch existing rows (staging history was stamped by hand). Tests: a spare enabled with the real
  number disabled → null; a matching row → its id; module mode unchanged.
