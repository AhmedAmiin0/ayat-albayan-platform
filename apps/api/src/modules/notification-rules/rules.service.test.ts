import { catalogueViews, NOTIFICATION_CATALOGUE, SETTING_DEFAULTS, TEMPLATE_KEYS } from '@ab/shared';
import type { AcademySettings, TemplateStatus, WaLine } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { readerOf } from '../../common/settings/settings.fakes';
import { AUTOMATIC_KEYS } from '../whatsapp/send-stale';
import type { SendGate } from '../whatsapp/send-gate';
import { NotificationRulesSettings } from './notification-rules.settings';
import { CATALOGUE_TEMPLATE_KEYS, type RulesQueries } from './rules.queries';
import { RulesService } from './rules.service';

const ALL_ON = {
  ...{ messaging_enabled: true, auto_messages_enabled: true, reminder_24h_enabled: true },
  ...{ teacher_whatsapp_lesson_reminder: true, teacher_whatsapp_new_student: true },
} satisfies Partial<AcademySettings>;
const approved = new Map(TEMPLATE_KEYS.map((k) => [k, { status: 'approved' as TemplateStatus, line: 'notifications' as WaLine }]));

function service(settings: AcademySettings = SETTING_DEFAULTS, reason: 'switch_off' | 'not_configured' | null = 'switch_off') {
  const deps = {
    settings: readerOf(NotificationRulesSettings, settings),
    gate: { state: vi.fn(async () => ({ open: reason === null, reason })) },
    queries: { templates: vi.fn(async () => approved), lines: vi.fn(async () => []) },
  };
  const svc = new RulesService(deps.settings, deps.gate as unknown as SendGate, deps.queries as unknown as RulesQueries);
  return { svc, deps };
}

describe('RulesService.overview: today’s state, read-only', () => {
  it('fresh install: every WhatsApp row off because sending is off; staff alerts on', async () => {
    const { entries } = await service().svc.overview();
    const byKey = new Map(entries.map((e) => [e.key, e]));
    expect(byKey.get('report_ready')).toMatchObject({ state: 'off', blocker: 'messaging_off' });
    expect(byKey.get('reminder_failed')).toMatchObject({ state: 'on', blocker: null });
  });

  it('sending and automatic on: rows follow their own switches (24 h reminder off by default)', async () => {
    const settings = { ...SETTING_DEFAULTS, messaging_enabled: true, auto_messages_enabled: true };
    const { entries } = await service(settings, null).svc.overview();
    const state = Object.fromEntries(entries.map((e) => [e.key, e.blocker ?? e.state]));
    expect(state).toMatchObject({ lesson_reminder: 'on', lesson_reminder_24h: 'row_off', booking_confirmation: 'on', lesson_rating: 'on' });
  });

  it.each([
    ['the defaults', SETTING_DEFAULTS],
    ['every switch on', { ...SETTING_DEFAULTS, ...ALL_ON }],
  ])('the catalogue slice gives the same rows as the full settings (%s)', async (_name, full) => {
    const { entries } = await service(full, null).svc.overview();
    expect(entries).toEqual(catalogueViews({ settings: full, gateReason: null, templates: approved }));
  });

  it('the server without WhatsApp is named, even with the switch on', async () => {
    const { entries } = await service({ ...SETTING_DEFAULTS, messaging_enabled: true }, 'not_configured').svc.overview();
    expect(entries.find((e) => e.key === 'booking_confirmation')?.blocker).toBe('not_configured');
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
