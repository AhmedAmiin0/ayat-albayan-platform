import { describe, expect, it } from 'vitest';
import type { TemplateStatus, WaLine } from '../../enums/index.js';
import { TEMPLATE_KEYS } from '../../messaging/templates/templates.js';
import { SETTING_DEFAULTS, type AcademySettings } from '../../settings/index.js';
import { catalogueViews, entryView, type CatalogueInputs } from './catalogue-state.js';
import { notificationEntry, type NotificationKey } from './catalogue.js';

const approvedAll = new Map(TEMPLATE_KEYS.map((k) => [k, { status: 'approved' as TemplateStatus, line: 'notifications' as WaLine }]));
const ALL_ON: AcademySettings = {
  ...SETTING_DEFAULTS,
  messaging_enabled: true,
  auto_messages_enabled: true,
  reminder_24h_enabled: true,
};

function view(key: NotificationKey, patch: Partial<CatalogueInputs> = {}) {
  return entryView(notificationEntry(key), { settings: ALL_ON, gateReason: null, templates: approvedAll, ...patch });
}

describe('entryView: the first blocker, fail-closed', () => {
  it('a fresh install (defaults) sends nothing: messaging_off on every WhatsApp row', () => {
    const rows = catalogueViews({ settings: SETTING_DEFAULTS, gateReason: 'switch_off', templates: approvedAll });
    for (const r of rows.filter((r) => r.channels.includes('whatsapp'))) {
      expect([r.key, r.state === 'on', r.blocker]).toEqual([r.key, false, 'messaging_off']);
    }
  });

  it('a malformed stored switch (anything but true) reads as off', () => {
    const settings = { ...ALL_ON, messaging_enabled: 'yes' as unknown as boolean };
    expect(view('report_ready', { settings })).toMatchObject({ state: 'off', blocker: 'messaging_off' });
  });

  it('checks in order: server config, switch, automatic, the row, the template', () => {
    expect(view('report_ready', { gateReason: 'not_configured', settings: SETTING_DEFAULTS }).blocker).toBe('not_configured');
    expect(view('lesson_reminder_24h', { gateReason: 'not_configured', settings: { ...ALL_ON, auto_messages_enabled: false } }).blocker).toBe('not_configured');
    expect(view('lesson_reminder_24h', { settings: { ...ALL_ON, auto_messages_enabled: false, reminder_24h_enabled: false } }).blocker).toBe('auto_off');
    expect(view('lesson_reminder_24h', { settings: { ...ALL_ON, reminder_24h_enabled: false } }).blocker).toBe('row_off');
    expect(view('lesson_reminder_24h', { templates: new Map() }).blocker).toBe('template_not_approved');
    expect(view('lesson_reminder_24h')).toMatchObject({ state: 'on', blocker: null });
  });

  it('booking confirmations ignore the automatic switch; rating follows feedback_mode', () => {
    expect(view('booking_confirmation', { settings: { ...ALL_ON, auto_messages_enabled: false } }).state).toBe('on');
    expect(view('lesson_rating', { settings: { ...ALL_ON, feedback_mode: 'link' } }).blocker).toBe('row_off');
  });

  it('one approved variant is enough; the rows list each variant with its status and number', () => {
    const templates = new Map([
      ['lesson_reminder', { status: 'pending' as TemplateStatus, line: 'notifications' as WaLine }],
      ['lesson_reminder_meet', { status: 'approved' as TemplateStatus, line: 'chat' as WaLine }],
    ]);
    const v = view('lesson_reminder', { templates });
    expect(v.state).toBe('on');
    expect(v.lines).toEqual(['notifications', 'chat']);
    expect(v.templates).toContainEqual({ key: 'lesson_reminder_plain', status: null, line: null });
    // Nothing synced yet: the registry's default number, never «the chat's».
    expect(view('report_ready', { templates: new Map() }).lines).toEqual(['notifications']);
  });

  it('hand sends are «manual» and still show a closed gate; staff push rows are always on', () => {
    expect(view('lesson_feedback_request')).toMatchObject({ state: 'manual', blocker: null });
    expect(view('inbox_templates', { settings: { ...ALL_ON, messaging_enabled: false } })).toMatchObject({ state: 'manual', blocker: 'messaging_off' });
    expect(view('reminder_failed', { settings: SETTING_DEFAULTS, gateReason: 'switch_off' })).toMatchObject({ state: 'on', blocker: null, lines: [] });
  });

  it('timing shows the governing setting’s value', () => {
    expect(view('lesson_reminder', { settings: { ...ALL_ON, reminder_minutes_before: 45 } }).timing).toEqual({ key: 'reminder_minutes_before', value: '45' });
    expect(view('follow_up_slots', { settings: { ...ALL_ON, follow_up_hours: [24, 72] } }).timing?.value).toBe('24، 72');
    expect(view('report_ready').timing).toBeNull();
  });
});
