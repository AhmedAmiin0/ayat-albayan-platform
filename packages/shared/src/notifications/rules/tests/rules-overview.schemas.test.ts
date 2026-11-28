import { SETTING_DEFAULTS } from '@ab/settings';
import { describe, expect, it } from 'vitest';
import { TEMPLATE_KEYS } from '../../../messaging/templates/templates';
import { catalogueViews } from '../../catalogue/catalogue-state';
import {
  notificationEntryViewSchema,
  notificationsOverviewSchema,
} from '../rules-overview.schemas';

const templates = new Map(
  TEMPLATE_KEYS.map((key) => [key, { status: 'approved' as const, line: 'chat' as const }]),
);
const entries = catalogueViews({ settings: SETTING_DEFAULTS, gateReason: null, templates });
const rule = {
  key: 'lesson_reminder',
  enabled: true,
  channels: ['whatsapp'],
  timing: { minutes_before: 30 },
  number_id: null,
  editable: true,
  optional_channels: [],
  updated_at: '2026-11-27T10:00:00.000Z',
  updated_by: null,
};
const line = {
  line: 'notifications',
  display_phone_e164: '+15550000000',
  verified_name: null,
  checked_at: '2026-11-27T10:00:00.000Z',
};

describe('notificationEntryViewSchema', () => {
  it('passes every catalogue row unchanged', () => {
    expect(entries.map((entry) => notificationEntryViewSchema.parse(entry))).toEqual(entries);
  });

  it('keeps a row with its rule', () => {
    const [first] = entries;
    const row = { ...first, rule };
    expect(notificationEntryViewSchema.parse(row)).toEqual(row);
  });

  it('refuses a blocker the catalogue does not know', () => {
    const [first] = entries;
    expect(notificationEntryViewSchema.safeParse({ ...first, blocker: 'paused' }).success).toBe(
      false,
    );
  });

  it('refuses a rule timing no timed key has', () => {
    const [first] = entries;
    const bad = { ...first, rule: { ...rule, timing: { minutes_before: 1 } } };
    expect(notificationEntryViewSchema.safeParse(bad).success).toBe(false);
  });
});

describe('notificationsOverviewSchema', () => {
  it('keeps the first shape, without mode and reach', () => {
    const v1 = { entries, lines: [line] };
    expect(notificationsOverviewSchema.parse(v1)).toEqual(v1);
  });

  it('keeps the tagged shape with mode and reach', () => {
    const v2 = { entries, lines: [], mode: 'module', reach: { guardian: 2, teacher: 1, lead: 0 } };
    expect(notificationsOverviewSchema.parse(v2)).toEqual(v2);
  });

  it('refuses a mode other than legacy or module', () => {
    expect(notificationsOverviewSchema.safeParse({ entries, lines: [], mode: 'x' }).success).toBe(
      false,
    );
  });
});
