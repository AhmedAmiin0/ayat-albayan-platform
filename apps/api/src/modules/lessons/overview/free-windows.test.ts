import { describe, expect, it } from 'vitest';
import type { TimeRange, WeeklyRow } from '../../teachers/availability/free-slots';
import { teacherSpans } from './free-windows';

const RIYADH = 'Asia/Riyadh';
const CAIRO = 'Africa/Cairo';
const span = (start: string, end: string): TimeRange => ({ start: new Date(start), end: new Date(end) });
const iso = (list: { start: number; end: number }[]) =>
  list.map((i) => `${new Date(i.start).toISOString().slice(5, 16)}–${new Date(i.end).toISOString().slice(11, 16)}`);

// Sunday 2026-10-04 16:00–18:00 Riyadh = 13:00Z–15:00Z; the window is that Riyadh day.
const SUN_16_18: WeeklyRow = { weekday: 0, start_time: '16:00:00', end_time: '18:00:00', tz: RIYADH };
const DAY: [string, string] = ['2026-10-03T21:00:00Z', '2026-10-04T21:00:00Z'];

type Case = {
  name: string;
  window?: [string, string];
  weekly?: WeeklyRow[];
  timeOff?: TimeRange[];
  busy?: TimeRange[];
  windows: string[];
  free: string[];
};

const CASES: Case[] = [
  { name: 'a plain window is all free', windows: ['10-04T13:00–15:00'], free: ['10-04T13:00–15:00'] },
  { name: 'no weekly rows → nothing', weekly: [], windows: [], free: [] },
  {
    name: 'a lesson cuts the window; both 30+ min sides stay',
    busy: [span('2026-10-04T13:30:00Z', '2026-10-04T14:15:00Z')],
    windows: ['10-04T13:00–15:00'],
    free: ['10-04T13:00–13:30', '10-04T14:15–15:00'],
  },
  {
    name: 'gaps under 30 min are dropped',
    busy: [span('2026-10-04T13:20:00Z', '2026-10-04T14:45:00Z')],
    windows: ['10-04T13:00–15:00'],
    free: [],
  },
  {
    name: 'time off splits a window',
    timeOff: [span('2026-10-04T13:45:00Z', '2026-10-04T14:15:00Z')],
    windows: ['10-04T13:00–15:00'],
    free: ['10-04T13:00–13:45', '10-04T14:15–15:00'],
  },
  {
    name: 'a day off covers the whole window',
    timeOff: [span('2026-10-03T21:00:00Z', '2026-10-04T21:00:00Z')],
    windows: ['10-04T13:00–15:00'],
    free: [],
  },
  {
    name: '23:59 means midnight: 22:00–23:59 + 00:00–02:00 is one span',
    window: ['2026-10-03T21:00:00Z', '2026-10-05T21:00:00Z'],
    weekly: [
      { weekday: 0, start_time: '22:00', end_time: '23:59', tz: RIYADH },
      { weekday: 1, start_time: '00:00', end_time: '02:00', tz: RIYADH },
    ],
    windows: ['10-04T19:00–23:00'],
    free: ['10-04T19:00–23:00'],
  },
  {
    name: 'clipped to the window',
    window: ['2026-10-04T14:00:00Z', '2026-10-04T21:00:00Z'],
    windows: ['10-04T14:00–15:00'],
    free: ['10-04T14:00–15:00'],
  },
  {
    name: 'Cairo keeps its wall clock across the October fall-back',
    window: ['2026-10-25T00:00:00Z', '2026-11-02T00:00:00Z'],
    weekly: [{ weekday: 0, start_time: '16:00', end_time: '17:00', tz: CAIRO }],
    windows: ['10-25T13:00–14:00', '11-01T14:00–15:00'],
    free: ['10-25T13:00–14:00', '11-01T14:00–15:00'],
  },
];

describe('teacherSpans (R-SCH-09 all-teachers calendar)', () => {
  it.each(CASES)('$name', (c) => {
    const [from, to] = c.window ?? DAY;
    const out = teacherSpans({
      from: new Date(from),
      to: new Date(to),
      weekly: c.weekly ?? [SUN_16_18],
      timeOff: c.timeOff ?? [],
      busy: c.busy ?? [],
    });
    expect(iso(out.windows)).toEqual(c.windows);
    expect(iso(out.free)).toEqual(c.free);
  });
});
