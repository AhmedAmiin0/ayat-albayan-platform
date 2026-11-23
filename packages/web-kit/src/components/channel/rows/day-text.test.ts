import { describe, expect, it } from 'vitest';
import { t } from '#/lib/i18n/i18n.ts';
import { dayChipText } from './day-text';

// Thursday 19 November 2026, 18:32 in Riyadh.
const clock = { now: new Date('2026-11-19T15:32:00Z'), tz: 'Asia/Riyadh' };

describe('a day chip’s words (owner 2026-10-27, «like whatsapp»)', () => {
  it('today, yesterday, the weekday within six days, else the date', () => {
    expect(dayChipText('2026-11-19T05:10:00Z', clock)).toBe(t.inbox.dayToday);
    expect(dayChipText('2026-11-18T17:40:00Z', clock)).toBe(t.inbox.dayYesterday);
    expect(dayChipText('2026-11-16T10:00:00Z', clock)).toBe(t.enums.weekday['1']);
    expect(dayChipText('2026-09-29T10:00:00Z', clock)).toMatch(/29/);
    expect(dayChipText('2025-09-29T10:00:00Z', clock)).toMatch(/2025/);
  });

  it('days are the student’s: 23:30 UTC on the 18th is already the 19th in Riyadh', () => {
    expect(dayChipText('2026-11-18T23:30:00Z', clock)).toBe(t.inbox.dayToday);
  });
});
