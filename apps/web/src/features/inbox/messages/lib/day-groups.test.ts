import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { dayLabel, withDays } from './day-groups';
import { message } from '../../testing/inbox-fixture';

const NOW = new Date(2026, 9, 5, 15, 0);
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).toISOString();

describe('date separators in the chat log', () => {
  it('today and yesterday by name, an older day by its date', () => {
    expect(dayLabel(new Date(2026, 9, 5, 1, 0), NOW)).toBe(t.inbox.dayToday);
    expect(dayLabel(new Date(2026, 9, 4, 23, 0), NOW)).toBe(t.inbox.dayYesterday);
    const older = dayLabel(new Date(2026, 9, 1, 9, 0), NOW);
    expect(older).not.toBe(t.inbox.dayToday);
    expect(older).toMatch(/1/);
  });

  it('yesterday across a month boundary', () => {
    expect(dayLabel(new Date(2026, 8, 30, 12, 0), new Date(2026, 9, 1, 8, 0))).toBe(t.inbox.dayYesterday);
  });

  it('one separator before the first message of each day, in order', () => {
    const items = withDays(
      [
        message({ id: 'a', created_at: at(3, 9) }),
        message({ id: 'b', created_at: at(3, 10) }),
        message({ id: 'c', created_at: at(5, 9) }),
      ],
      NOW,
    );
    expect(items.map((i) => (i.kind === 'day' ? 'day' : i.message.id))).toEqual(['day', 'a', 'b', 'day', 'c']);
    expect(items[3]).toMatchObject({ kind: 'day', label: t.inbox.dayToday });
  });

  it('no messages, no separators', () => {
    expect(withDays([], NOW)).toEqual([]);
  });
});
