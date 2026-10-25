import type { NotificationEntryView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { chipOf, factsOf, numberLine, whenOf } from './catalogue-words';

const c = t.notificationCatalogue;
const entry = (patch: Partial<NotificationEntryView> = {}): NotificationEntryView => ({
  key: 'lesson_reminder',
  audience: 'guardian',
  channels: ['whatsapp'],
  automatic: true,
  manual: false,
  essential: false,
  locked: false,
  state: 'off',
  blocker: 'auto_off',
  templates: [],
  lines: ['notifications'],
  timing: { key: 'reminder_minutes_before', value: '60' },
  ...patch,
});

test('chip: sends / not sent / by hand', () => {
  expect(chipOf(entry({ state: 'on' }))).toEqual({ tone: 'ok', glyph: 'fill', label: c.states.on });
  expect(chipOf(entry())).toMatchObject({ glyph: 'struck', label: c.states.off });
  expect(chipOf(entry({ state: 'manual' }))).toMatchObject({ glyph: 'hollow', label: c.states.manual });
});

test('when: trigger then timing; facts: audience, channel, number, then the blocker', () => {
  expect(whenOf(entry())).toBe(`${c.entries.lesson_reminder.trigger} · ${c.timing.reminder_minutes_before.replace('{value}', '60')}`);
  expect(factsOf(entry())).toBe([c.audience.guardian, c.channels.whatsapp, c.lines.notifications, c.blockers.auto_off].join(' · '));
  expect(factsOf(entry({ channels: ['bell', 'push'], lines: [], blocker: null, audience: 'staff' }))).toBe(
    [c.audience.staff, `${c.channels.bell}${t.common.listSeparator}${c.channels.push}`].join(' · '),
  );
  expect(factsOf(entry({ lines: [], blocker: null }))).toContain(c.chatNumber);
});

test('numberLine: the kept phone or nothing', () => {
  const kept = [{ line: 'chat' as const, display_phone_e164: '+201001234567', verified_name: null, checked_at: '2026-10-22T08:00:00Z' }];
  expect(numberLine('chat', kept)).toEqual({ label: c.lines.chat, phone: '+201001234567' });
  expect(numberLine('notifications', kept)).toEqual({ label: c.lines.notifications, phone: null });
});

test('a blocker this build has no words for (newer API) adds no reason, never «undefined»', () => {
  const unknown = entry({ blocker: 'future_reason' as unknown as NotificationEntryView['blocker'] });
  expect(factsOf(unknown)).toBe([c.audience.guardian, c.channels.whatsapp, c.lines.notifications].join(' · '));
  expect(factsOf(unknown)).not.toMatch(/undefined/);
});
