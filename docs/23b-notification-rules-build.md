# 23b — Phase 4 «قواعد الإشعارات»: build contract

Build notes for docs/23 §3 phase 4 as amended by docs/26 §6 row 23-P4 (branch `cloud/notif-rules`). The
shared contract is code: `packages/shared/src/notifications/rules.types.ts`, `rules.legacy.ts`,
`rules.effective.ts`; the API port `apps/api/src/modules/messaging/notification-rules/policy/policy.ts` + `rules.reader.ts`.

## Decisions

1. **Which keys.** The 8 keys of docs/26 §1 «MODULE التواصل → الإشعارات» (`RULE_SETTING_KEYS`) become
   `ownedBy: 'notifications'` **in the registry** and in `OWNED_SETTING_KEYS`. `renewal_alert_remaining` is
   not one of them and is never copied (docs/26 §1); the renewal row shows it by reference. (docs/26 §6
   says «7 of the 8» counting docs/23's list, which included `renewal_alert_remaining`; the copied set is
   the same.)
2. **Table** `public.notification_rules(key text pk, enabled bool not null, channels text[] null, timing jsonb
   null, number_id uuid null references wa_numbers on delete set null, updated_at, updated_by)`. RLS: admin
   read, writes service_role only. The migration copies the 6 rows that mirror a legacy key
   (`RULE_LEGACY_MAP`) from today's values, with the registry default for a missing, JSON-null or malformed
   value, `on conflict do nothing` (idempotent). It reads `settings` and never writes it.
3. **Mode.** `comms_source = legacy` (default): the legacy keys decide the mapped parts (byte-identical);
   the row decides only what has no legacy key (day-before hour, teacher lead time, the rows without a
   switch today). `module`: the row decides, legacy keys are the fallback. `resolveRule` is the one rule.
4. **Writes.** `PATCH /admin/notifications/:key` (alias `PATCH /admin/communications/notifications/:key`,
   docs/26b m7), permission `notifications.manage` (granted by the migration to every role holding
   `settings.write`). Legacy mode: writes the row **and** the mirrored legacy keys (so parity stays empty).
   Module mode: the row only — legacy rows are frozen. Locked rows: 422 `locked`; manual rows 422
   `not_editable`; an essential row's OFF needs `confirmText = ESSENTIAL_OFF_TEXT` (428
   `confirmation_required`) and writes an activity-log entry. Every write is audited.
5. **Flip.** `POST /admin/communications/source`: to `module` is refused while the numbers parity **or**
   the rules parity (rule vs legacy for every mapped part) is non-empty; back to `legacy` first copies the
   rules' effective mapped values into the legacy keys, then flips.
6. **Old clients.** `GET /admin/notifications` keeps the frozen v1 shape for requests without
   `X-AB-Client`; tagged clients get v2 (`rule`, `approval`, `mode`, `reach`, blocker `classroom_off`).
   `PATCH /settings` moves the 8 keys; `followUpHours` writes the rule when the caller holds
   `notifications.manage`, else it is `moved`. In module mode `GET /settings` shows the 8 keys computed
   from the rules (docs/26b m1/m3).
7. **Fail closed.** A failed rules read makes every row OFF for that pass (locked rows stay on). Nothing
   here reads or writes `messaging_enabled`, `auto_messages_enabled`, `crm_cutover_done` or the gate.
8. **Timings.** Day-before hour: `send_at_local` (a select of `DAY_BEFORE_HOURS`, null = the lesson's own
   time, today). Teacher lead time: `minutes_before` (null = the families' lead time, today). A lesson
   further ahead than `reminder_lookahead_hours` gets its day-before message once it enters the window.
