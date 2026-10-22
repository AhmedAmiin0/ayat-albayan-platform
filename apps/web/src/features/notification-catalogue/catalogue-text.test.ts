import type { NotificationEntryView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { blockerText, channelsText, numberParts, stateChip, tagsOf, whenText } from './catalogue-text';

const c = t.notificationCatalogue;
const entry = (patch: Partial<NotificationEntryView>): NotificationEntryView => ({
  key: 'lesson_reminder',
  audience: 'guardian',
  channels: ['whatsapp'],
  automatic: true,
  manual: false,
  essential: false,
  locked: false,
  state: 'on',
  blocker: null,
  templates: [],
  lines: ['notifications'],
  timing: { key: 'reminder_minutes_before', value: '60' },
  ...patch,
});
const LINES = [{ line: 'notifications' as const, display_phone_e164: '+966551234567', verified_name: null, checked_at: '2026-10-22T08:00:00Z' }];

describe('catalogue words', () => {
  it('the chip: sends (ok) / not sent (struck) / by hand (hollow), with the first blocker in words', () => {
    expect(stateChip(entry({}))).toEqual({ tone: 'ok', glyph: 'fill', label: c.states.on });
    expect(stateChip(entry({ state: 'off' }))).toMatchObject({ glyph: 'struck', label: c.states.off });
    expect(stateChip(entry({ state: 'manual' }))).toMatchObject({ glyph: 'hollow', label: c.states.manual });
    expect(blockerText(entry({ blocker: 'auto_off' }))).toBe(c.blockers.auto_off);
    expect(blockerText(entry({}))).toBeNull();
  });

  it('when = the trigger, then the timing with its value', () => {
    expect(whenText(entry({}))).toBe(`${c.entries.lesson_reminder.trigger} · ${c.timing.reminder_minutes_before.replace('{value}', '60')}`);
    expect(whenText(entry({ key: 'report_ready', timing: null }))).toBe(c.entries.report_ready.trigger);
  });

  it('channels and tags in words', () => {
    expect(channelsText(entry({ channels: ['bell', 'push'] }))).toBe(`${c.channels.bell}${t.common.listSeparator}${c.channels.push}`);
    expect(tagsOf(entry({ essential: true, locked: true }))).toEqual([c.tags.automatic, c.tags.essential, c.tags.locked]);
    expect(tagsOf(entry({ automatic: false }))).toEqual([]);
  });

  it('the number: each line with its kept phone; free text from the chat; none for bell / push', () => {
    expect(numberParts(entry({}), LINES)).toEqual([{ label: c.lines.notifications, phone: '+966551234567' }]);
    expect(numberParts(entry({ lines: ['chat'] }), LINES)).toEqual([{ label: c.lines.chat, phone: null }]);
    expect(numberParts(entry({ lines: [] }), LINES)).toEqual([{ label: c.chatNumber, phone: null }]);
    expect(numberParts(entry({ channels: ['bell'], lines: [] }), LINES)).toEqual([{ label: c.noNumber, phone: null }]);
  });
});
