import { NOTIFICATION_CATALOGUE, SETTING_DEFAULTS, TEMPLATE_KEYS, type TemplateStatus, type WaLine } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { SettingsService } from '../../common/settings/settings.service';
import { AUTOMATIC_KEYS } from '../whatsapp/send-stale';
import type { SendGate } from '../whatsapp/send-gate';
import { CATALOGUE_TEMPLATE_KEYS, type RulesQueries } from './rules.queries';
import { RulesService } from './rules.service';

const approved = new Map(TEMPLATE_KEYS.map((k) => [k, { status: 'approved' as TemplateStatus, line: 'notifications' as WaLine }]));

function service(settings = SETTING_DEFAULTS, reason: 'switch_off' | 'not_configured' | null = 'switch_off') {
  const deps = {
    settings: { all: vi.fn(async () => settings) },
    gate: { state: vi.fn(async () => ({ open: reason === null, reason })) },
    queries: { templates: vi.fn(async () => approved), lines: vi.fn(async () => []) },
  };
  const svc = new RulesService(deps.settings as unknown as SettingsService, deps.gate as unknown as SendGate, deps.queries as unknown as RulesQueries);
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
