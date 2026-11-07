import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { rowErrors, rowPicks } from './row-state';
import { besideText, farRows, rowBounds, rowsOpen, slotsWindow } from './row-window';

const C24 = { cycle: '24', locale: 'ar' } as const;
const NOW = new Date('2026-10-03T09:00:00.000Z'); // Saturday 12:00 Riyadh

describe('lesson rows: bounds and window', () => {
  it('opens on the course day, never before today in the family zone', () => {
    expect(rowsOpen('2026-10-10', 'Asia/Riyadh', NOW)).toBe('2026-10-10');
    expect(rowsOpen('2026-09-01', 'Asia/Riyadh', NOW)).toBe('2026-10-03');
    expect(rowsOpen(null, 'Asia/Riyadh', NOW)).toBe('2026-10-03');
  });

  it('from the opening day on, no last day (the API has none)', () => {
    expect(rowBounds('2026-10-10')).toEqual({ min: '2026-10-10' });
  });

  it('a row past one week from the earliest is flagged; so is a repeated weekday', () => {
    const rows = [
      { date: '2026-10-04', time: '17:00' },
      { date: '2026-10-11', time: '18:00' },
      { date: '2026-10-12', time: '18:00' },
    ];
    expect(farRows(rows)).toEqual([1, 2]);
    expect(rowErrors(rows).get(1)).toBe(t.lessonTimes.sameDay);
    expect(rowErrors(rows).get(2)).toBe(t.lessonTimes.farDay);
    expect(farRows([{ date: '', time: '' }])).toEqual([]);
  });

  it('the picks leave out the rows with a date error', () => {
    const rows = [
      { date: '2026-10-04', time: '17:00' },
      { date: '2026-10-07', time: '19:30' },
      { date: '2026-10-11', time: '17:00' },
    ];
    expect(rowPicks(rows, 'Asia/Riyadh')).toEqual(['2026-10-04T14:00:00.000Z', '2026-10-07T16:30:00.000Z']);
  });

  it('the slot window is the rows’ week in the family zone, from now on', () => {
    const empty = slotsWindow([], { opens: '2026-10-03', tz: 'Asia/Riyadh', now: NOW });
    expect(empty).toEqual({ from: NOW, to: new Date('2026-10-09T21:00:00.000Z') });
    const later = slotsWindow([{ date: '2026-10-11', time: '' }], { opens: '2026-10-03', tz: 'Asia/Riyadh', now: NOW });
    expect(later).toEqual({ from: new Date('2026-10-10T21:00:00.000Z'), to: new Date('2026-10-17T21:00:00.000Z') });
  });
});

describe('besideText: the viewer’s and the teacher’s clocks beside the family’s time', () => {
  const at = '2026-10-04T14:00:00.000Z'; // 17:00 Riyadh, 15:00 London (BST), 19:00 Karachi

  it('each clock only when it reads otherwise', () => {
    const zones = { studentTz: 'Asia/Riyadh', viewerTz: 'Europe/London', teacherTz: 'Asia/Karachi' };
    const viewer = t.lessonTimes.viewerTime.replace('{time}', '15:00');
    const teacher = t.lessonTimes.teacherTime.replace('{time}', '19:00');
    expect(besideText(at, zones, C24)).toBe(`${viewer}${t.common.listSeparator}${teacher}`);
    const same = { studentTz: 'Asia/Riyadh', viewerTz: 'Asia/Riyadh', teacherTz: null };
    expect(besideText(at, same, C24)).toBe('');
  });
});
