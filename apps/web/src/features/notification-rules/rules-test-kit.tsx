import {
  catalogueViews,
  notificationEntry,
  SETTING_DEFAULTS,
  type AnyRuleTiming,
  type NotificationAudience,
  type NotificationEntryView,
  type NotificationRuleView,
  type NotificationsOverview,
} from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import type { Mock } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { NUMBERS } from '@/features/numbers/numbers.fixture';
import { t } from '@/lib/i18n';
import { RulesSection } from './RulesSection';

// Shared by the «الإشعارات» tests (not app code). Each test file mocks @/lib/api, the router's Link
// and @/features/auth/use-permissions. Fake ids only.

const TIMINGS: Partial<Record<string, AnyRuleTiming>> = {
  lesson_reminder: { minutes_before: 60 },
  lesson_reminder_24h: { send_at_local: null },
  teacher_lesson_reminder: { minutes_before: null },
  follow_up_slots: { hours: [24, 72], slots_from_hours: 12, slots_to_days: 7 },
};

/** The v2 rule of a catalogue row as the API would send it (every automatic row editable). */
export function ruleOf(entry: NotificationEntryView, patch: Partial<NotificationRuleView> = {}): NotificationRuleView {
  return {
    key: entry.key,
    enabled: notificationEntry(entry.key).rowSwitch?.isOn(SETTING_DEFAULTS) ?? true,
    channels: [...entry.channels],
    timing: TIMINGS[entry.key] ?? null,
    number_id: null,
    editable: !entry.manual && !entry.locked,
    optional_channels: [],
    updated_at: null,
    updated_by: null,
    ...patch,
  };
}

/** GET /admin/notifications v2 with sending off, every template approved; `patch` edits rows by key. */
export function overview(patch: Partial<Record<string, Partial<NotificationEntryView>>> = {}): NotificationsOverview {
  const base = catalogueViews({ settings: SETTING_DEFAULTS, gateReason: 'switch_off', templates: new Map() });
  const entries = base.map((e) => {
    const withRule: NotificationEntryView = { ...e, approval: e.templates.length > 0 ? 'all' : null, rule: ruleOf(e) };
    return { ...withRule, ...patch[e.key] };
  });
  return { entries, lines: [], mode: 'legacy', reach: { guardian: 12, teacher: 3, lead: 25 } };
}

/** «الإشعارات» with every GET it makes answered. */
export function renderRules(input: {
  apiFetch: Mock;
  data?: NotificationsOverview;
  onSaved?: (m: string) => void;
  queued?: number;
  audience?: NotificationAudience;
}) {
  routeFetch(input.apiFetch, [
    ['/admin/notifications', input.data ?? overview()],
    ['/admin/numbers', NUMBERS],
    ['/settings/integrations', []],
    ['/settings', SETTING_DEFAULTS],
    ['/messages/gate', { open: false, reason: 'switch_off', queued: input.queued ?? 0 }],
  ]);
  return renderWithClient(<RulesSection onSaved={input.onSaved ?? (() => undefined)} audience={input.audience} />);
}

/** The table row of one notification, once the list is in. */
export async function findRow(key: string): Promise<HTMLElement> {
  const region = await screen.findByRole('region', { name: t.notificationRules.title });
  await within(region).findByRole('table');
  const row = region.querySelector(`[data-key="${key}"]`);
  if (!(row instanceof HTMLElement)) throw new Error(`no row ${key}`);
  return row;
}

/** Opens an audience tab by its label. */
export function openTab(label: string) {
  fireEvent.click(screen.getByRole('tab', { name: new RegExp(label) }));
}
