import {
  notificationEntry,
  optionalChannels,
  type EffectiveRule,
  type NotificationEntryView,
  type NotificationRuleRow,
  type NotificationRuleView,
} from '@ab/shared';

// GET /admin/notifications in its two shapes (docs/26 §2f): v1 frozen for untagged clients (0.2.0's
// catalogue-words.ts crashes on new fields' words), v2 for clients sending X-AB-Client.

/** Exactly the fields 0.2.0 knows, in its order; the v2-only blocker reads as row_off. */
export function v1Entry(view: NotificationEntryView): NotificationEntryView {
  return {
    key: view.key,
    audience: view.audience,
    channels: view.channels,
    automatic: view.automatic,
    manual: view.manual,
    essential: view.essential,
    locked: view.locked,
    state: view.state,
    blocker: view.blocker === 'classroom_off' ? 'row_off' : view.blocker,
    templates: view.templates,
    lines: view.lines,
    timing: view.timing,
  };
}

/** The admin's choices for a row, as v2 shows them next to its v1 fields. */
export function ruleView(view: NotificationEntryView, rule: EffectiveRule, row: NotificationRuleRow | null): NotificationRuleView {
  const entry = notificationEntry(view.key);
  return {
    key: view.key,
    enabled: rule.enabled,
    channels: [...rule.channels],
    timing: rule.timing,
    number_id: rule.number_id,
    editable: !entry.manual && !entry.locked,
    optional_channels: optionalChannels(entry),
    updated_at: row?.updated_at ?? null,
    updated_by: row?.updated_by ?? null,
  };
}
