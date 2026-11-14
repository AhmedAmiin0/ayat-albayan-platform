import { describe, expect, it } from 'vitest';
import { bellRow, lesson, NOW, TZ } from './alerts-fixture.js';
import { DEFAULT_HOME_PREFS } from './home-prefs.js';
import { todayAlerts, type AlertInput } from './today-alerts.js';

const run = (o: Partial<AlertInput>) =>
  todayAlerts({ lessons: [], bell: [], now: NOW, tz: TZ, shown: DEFAULT_HOME_PREFS.alerts, ...o });
const kinds = (o: Partial<AlertInput>) => run(o).map((a) => a.key);

describe('todayAlerts', () => {
  it('none on a quiet day', () => {
    expect(run({})).toEqual([]);
    expect(kinds({ lessons: [lesson({ id: 'a' })] })).toEqual([]);
  });

  it('a lesson within 15 minutes, with the minutes left', () => {
    const l = lesson({ id: 'a', starts_at: '2026-11-14T09:10:00Z' });
    expect(run({ lessons: [l] })).toEqual([{ kind: 'soon', key: 'soon:a', lesson: l, minutes: 10 }]);
    expect(kinds({ lessons: [lesson({ id: 'b', starts_at: '2026-11-14T09:16:00Z' })] })).toEqual([]);
    const closed = lesson({ id: 'c', starts_at: '2026-11-14T09:05:00Z', status: 'cancelled_by_admin' });
    expect(kinds({ lessons: [closed] })).toEqual(['changed:c']);
  });

  it('lessons awaiting her «سأحضر»', () => {
    expect(kinds({ lessons: [lesson({ id: 'a', teacher_confirmed_at: null })] })).toEqual(['confirm:a']);
  });

  it('reports to write, resume or still in the edit window', () => {
    const past = { starts_at: '2026-11-14T06:00:00Z', ends_at: '2026-11-14T07:00:00Z' };
    const s = (report: unknown) => [{ id: 's', report }] as never;
    const write = lesson({ id: 'w', ...past, students: s(null) });
    const draft = lesson({ id: 'd', ...past, students: s({ id: 'r', status: 'draft' }) });
    const until = '2026-11-14T10:00:00Z';
    const open = lesson({ id: 'o', ...past, students: s({ id: 'r', status: 'submitted', edit_until: until }) });
    const done = lesson({ id: 'x', ...past, students: s({ id: 'r', status: 'submitted', edit_until: null }) });
    const out = run({ lessons: [write, draft, open, done] });
    expect(out.map((a) => (a.kind === 'report' ? a.stage : a.kind))).toEqual(['write', 'resume', 'window']);
  });

  it('only today in her zone, in start order', () => {
    const late = lesson({ id: 'late', status: 'cancelled_by_teacher', starts_at: '2026-11-14T15:00:00Z' });
    const early = lesson({ id: 'early', status: 'cancelled_by_teacher', starts_at: '2026-11-14T10:00:00Z' });
    const tomorrow = lesson({ id: 'tom', status: 'cancelled_by_teacher', starts_at: '2026-11-14T21:30:00Z' });
    expect(kinds({ lessons: [late, tomorrow, early] })).toEqual(['changed:early', 'changed:late']);
  });

  it('unread bell rows from today, never money or inbox kinds', () => {
    const bell = [
      bellRow({ id: 'n1' }),
      bellRow({ id: 'n2', read_at: '2026-11-14T08:00:00Z' }),
      bellRow({ id: 'n3', created_at: '2026-11-13T20:00:00Z' }),
      bellRow({ id: 'n4', kind: 'payment_received' }),
      bellRow({ id: 'n5', kind: 'new_message' }),
    ];
    expect(kinds({ bell })).toEqual(['bell:n1']);
  });

  it('kinds switched off stay out', () => {
    const lessons = [lesson({ id: 'a', teacher_confirmed_at: null, starts_at: '2026-11-14T09:10:00Z' })];
    const bell = [bellRow({ id: 'n1' })];
    expect(kinds({ lessons, bell })).toEqual(['soon:a', 'confirm:a', 'bell:n1']);
    const shown = { ...DEFAULT_HOME_PREFS.alerts, soon: false, bell: false };
    expect(kinds({ lessons, bell, shown })).toEqual(['confirm:a']);
  });
});
