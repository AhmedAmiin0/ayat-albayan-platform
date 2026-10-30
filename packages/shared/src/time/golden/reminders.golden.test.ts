import { describe, expect, it } from 'vitest';
import { reopenDedupKey } from '../../messaging/chat/thread-reopen.js';
import { dayBeforeSendAt, localDayStart } from '../../messaging/lesson/timing.day-before.js';
import { reminderDue } from '../../messaging/lesson/timing.js';
import { zonedInstant } from '../../schedule/lessons/series/zoned.js';
import { riyadhToday } from '../riyadh-day.js';
import { GOLDEN_TIMES, GOLDEN_ZONES, digest, goldenDates, goldenInstants } from '../../testing/golden-sweep.js';

// Regression goldens (docs/34 §7): what decides when a message goes out (the day-before reminder's
// send instant and expiry, «is it due», the reopen dedup day) and the wall-clock picks a series is
// generated from. The digests were taken from the pre-date-fns code (Intl + ms math): a different
// instant anywhere in the year, in any zone, changes them.

const instants = goldenInstants();
const HOUR = 3_600_000;

function reminderLines(zone: string): string[] {
  return instants.map((at) => {
    const lessonTime = dayBeforeSendAt(at, zone).toISOString();
    const fixed = dayBeforeSendAt(at, zone, '18:30').toISOString();
    const expiry = localDayStart(at, zone).toISOString();
    const due = [3, 20, 30].map((h) => {
      const now = new Date(at.getTime() - h * HOUR);
      return reminderDue({ kind: 'day_before', startsAt: at, tz: zone, minutesBefore: 60, now }) ? 1 : 0;
    });
    return `${lessonTime} ${fixed} ${expiry} ${due.join('')}`;
  });
}

const pickLines = (zone: string): string[] =>
  goldenDates().flatMap((date) => GOLDEN_TIMES.map((time) => zonedInstant(date, time, zone)));

const EXPECTED: Record<string, { reminders: string; picks: string }> = {
  'Africa/Cairo': { reminders: '18240:907dba5d', picks: '5700:83595874' },
  'Asia/Riyadh': { reminders: '18240:7d60f489', picks: '5700:b6f52d53' },
  'Asia/Dubai': { reminders: '18240:e1d31599', picks: '5700:f1a17c07' },
  'Asia/Kuwait': { reminders: '18240:7d60f489', picks: '5700:b6f52d53' },
  'Asia/Qatar': { reminders: '18240:7d60f489', picks: '5700:b6f52d53' },
  'Europe/London': { reminders: '18240:a92da0bb', picks: '5700:580c4659' },
  'America/New_York': { reminders: '18240:61700b95', picks: '5700:5464dfbd' },
};

describe.each(GOLDEN_ZONES)('pinned instants in %s', (zone) => {
  it('day-before send instant (lesson time and 18:30), its expiry, and when it is due', () => {
    expect(digest(reminderLines(zone))).toBe(EXPECTED[zone]?.reminders);
  });

  it('wall-clock picks (zonedInstant) for every day and time of the sweep', () => {
    expect(digest(pickLines(zone))).toBe(EXPECTED[zone]?.picks);
  });
});

describe('academy days (Asia/Riyadh)', () => {
  it('riyadhToday and the reopen dedup day of every half hour', () => {
    const lines = instants.map((at) => `${riyadhToday(at)} ${reopenDedupKey('+966500000000', at)}`);
    expect(digest(lines)).toBe('18240:186aec0d');
  });

  it('Cairo 2026-10-29: the reminder for Friday 00:30 goes at Thursday 00:30 summer time (+3), and expires at Friday 00:00 (+2)', () => {
    const friday = new Date('2026-10-29T22:30:00Z');
    expect(dayBeforeSendAt(friday, 'Africa/Cairo').toISOString()).toBe('2026-10-28T21:30:00.000Z');
    expect(localDayStart(friday, 'Africa/Cairo').toISOString()).toBe('2026-10-29T22:00:00.000Z');
  });
});
