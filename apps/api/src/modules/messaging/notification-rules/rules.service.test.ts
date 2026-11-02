import { catalogueViews, NOTIFICATION_CATALOGUE, SETTING_DEFAULTS, TEMPLATE_KEYS } from '@ab/shared';
import type { AcademySettings, TemplateStatus, WaLine } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import { AUTOMATIC_KEYS } from '@/modules/messaging/whatsapp/sender/send-stale';
import type { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { NotificationRulesSettings } from './notification-rules.settings';
import { fakePolicy, type FakePolicyInput } from './policy/policy.fakes';
import { RulesFacts } from './policy/rules.facts';
import { CATALOGUE_TEMPLATE_KEYS, type RulesRepo } from './rules.repo';
import { RulesService } from './rules.service';
import { v1Entry } from './rules.views';

const ALL_ON = {
  ...{ messaging_enabled: true, auto_messages_enabled: true, reminder_24h_enabled: true },
  ...{ teacher_whatsapp_lesson_reminder: true, teacher_whatsapp_new_student: true },
} satisfies Partial<AcademySettings>;
const approved = new Map(TEMPLATE_KEYS.map((k) => [k, { status: 'approved' as TemplateStatus, line: 'notifications' as WaLine }]));

interface Setup {
  settings?: AcademySettings;
  reason?: 'switch_off' | 'not_configured' | null;
  rules?: FakePolicyInput;
  classroom?: boolean;
}

function service(opts: Setup = {}) {
  const settings = opts.settings ?? SETTING_DEFAULTS;
  const reason = opts.reason === undefined ? 'switch_off' : opts.reason;
  const queries = {
    templates: vi.fn(async () => approved),
    lines: vi.fn(async () => []),
    reach: vi.fn(async () => ({ guardian: 3, teacher: 2, lead: 1 })),
    classroom: vi.fn(() => opts.classroom ?? true),
  };
  const gate = { state: vi.fn(async () => ({ open: reason === null, reason })) };
  const facts = new RulesFacts(readerOf(NotificationRulesSettings, settings), gate as unknown as SendGate, queries as unknown as RulesRepo);
  const rules: FakePolicyInput = { ...opts.rules, settings: { ...settings, ...opts.rules?.settings } };
  return { svc: new RulesService(facts, fakePolicy(rules)), queries };
}
const V1 = { v2: false };

describe('RulesService.overview (v1): today’s state', () => {
  it('fresh install: every WhatsApp row off because sending is off; staff alerts on', async () => {
    const { entries } = await service().svc.overview(V1);
    const byKey = new Map(entries.map((e) => [e.key, e]));
    expect(byKey.get('report_ready')).toMatchObject({ state: 'off', blocker: 'messaging_off' });
    expect(byKey.get('reminder_failed')).toMatchObject({ state: 'on', blocker: null });
  });

  it('sending and automatic on: rows follow their own switches (24 h reminder off by default)', async () => {
    const settings = { ...SETTING_DEFAULTS, messaging_enabled: true, auto_messages_enabled: true };
    const { entries } = await service({ settings, reason: null }).svc.overview(V1);
    const state = Object.fromEntries(entries.map((e) => [e.key, e.blocker ?? e.state]));
    expect(state).toMatchObject({ lesson_reminder: 'on', lesson_reminder_24h: 'row_off', booking_confirmation: 'on', lesson_rating: 'on' });
  });

  it.each([
    ['the defaults', SETTING_DEFAULTS],
    ['every switch on', { ...SETTING_DEFAULTS, ...ALL_ON }],
  ])('legacy mode, no rows: exactly the v1 rows of before (%s)', async (_name, full) => {
    const { entries } = await service({ settings: full, reason: null }).svc.overview(V1);
    expect(entries).toEqual(catalogueViews({ settings: full, gateReason: null, templates: approved }).map(v1Entry));
  });

  it('v1 rows carry exactly the frozen fields; no mode, no reach; classroom_off reads row_off', async () => {
    const settings = { ...SETTING_DEFAULTS, ...ALL_ON };
    const t = service({ settings, reason: null, classroom: false });
    const view = await t.svc.overview(V1);
    expect(Object.keys(view).sort()).toEqual(['entries', 'lines']);
    const keys = ['key', 'audience', 'channels', 'automatic', 'manual', 'essential', 'locked', 'state', 'blocker', 'templates', 'lines', 'timing'];
    for (const e of view.entries) expect(Object.keys(e)).toEqual(keys);
    expect(view.entries.find((e) => e.key === 'lesson_join_link')?.blocker).toBe('row_off');
    expect(t.queries.reach).not.toHaveBeenCalled();
  });

  it('the server without WhatsApp is named, even with the switch on', async () => {
    const { entries } = await service({ settings: { ...SETTING_DEFAULTS, messaging_enabled: true }, reason: 'not_configured' }).svc.overview(V1);
    expect(entries.find((e) => e.key === 'booking_confirmation')?.blocker).toBe('not_configured');
  });

  it('fail closed: rules unread → every row off but the locked one', async () => {
    const settings = { ...SETTING_DEFAULTS, ...ALL_ON };
    const { entries } = await service({ settings, reason: null, rules: { fail: true } }).svc.overview(V1);
    const on = entries.filter((e) => e.state === 'on').map((e) => e.key);
    expect(on).toEqual(['reminder_failed']);
  });
});

describe('RulesService.overview (v2)', () => {
  it('adds rule, approval, mode, reach and the classroom blocker', async () => {
    const settings = { ...SETTING_DEFAULTS, ...ALL_ON };
    const rows = [{ key: 'booking_confirmation', enabled: false, updated_by: 'a0000000-0000-4000-8000-000000000001' }];
    const view = await service({ settings, reason: null, classroom: false, rules: { mode: 'module', rows } }).svc.overview({ v2: true });
    expect(view).toMatchObject({ mode: 'module', reach: { guardian: 3, teacher: 2, lead: 1 } });
    const byKey = new Map(view.entries.map((e) => [e.key, e]));
    expect(byKey.get('lesson_join_link')).toMatchObject({ blocker: 'classroom_off', approval: 'all' });
    expect(byKey.get('booking_confirmation')).toMatchObject({ state: 'off', blocker: 'row_off' });
    expect(byKey.get('booking_confirmation')?.rule).toMatchObject({ enabled: false, editable: true, updated_by: rows[0]?.updated_by });
    expect(byKey.get('reminder_failed')?.rule).toMatchObject({ enabled: true, editable: false, optional_channels: ['push'] });
    expect(byKey.get('inbox_templates')?.rule?.editable).toBe(false);
    expect(byKey.get('new_lead')?.approval).toBeNull();
  });

  it('entry(key): one row in the v2 shape', async () => {
    const e = await service({ rules: { rows: [{ key: 'lesson_reminder', timing: { minutes_before: 30 } }], mode: 'module' } }).svc.entry('lesson_reminder');
    expect(e).toMatchObject({ key: 'lesson_reminder', timing: { value: '30' }, rule: { timing: { minutes_before: 30 } } });
  });
});

describe('the catalogue matches the sender', () => {
  it('its automatic rows send exactly the sender’s AUTOMATIC_KEYS (auto_messages_enabled governs both)', () => {
    const auto = NOTIFICATION_CATALOGUE.filter((e) => e.automatic).flatMap((e) => [...e.templates]);
    expect([...auto].sort()).toEqual([...AUTOMATIC_KEYS].sort());
  });

  it('it asks message_templates for every producer template', () => {
    expect([...CATALOGUE_TEMPLATE_KEYS].sort()).toEqual([...TEMPLATE_KEYS].sort());
  });
});
