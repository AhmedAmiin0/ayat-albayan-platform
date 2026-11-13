import type { LessonStatus } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { splitToday } from './split-today';

// 3 Oct 2026; now = 12:00Z. Lessons of 45 min.
const NOW = new Date('2026-10-03T12:00:00.000Z');
const at = (id: string, hhmm: string, status?: LessonStatus) =>
  lesson({ id, starts_at: `2026-10-03T${hhmm}:00.000Z`, ...(status && { status }) });

const ENDED = at('ended', '09:00');
const RUNNING = at('running', '11:30');
const LATER = at('later', '15:00');
const ids = (list: readonly { id: string }[]) => list.map((l) => l.id);

describe('splitToday (docs/48 day rows rule)', () => {
  it('drops cancelled and rescheduled lessons, keeps excused', () => {
    const lessons = [at('c', '14:00', 'cancelled_by_teacher'), at('m', '16:00', 'rescheduled'), at('x', '10:00', 'excused')];
    const s = splitToday(lessons, { now: NOW, heroId: null });
    expect(ids(s.rest)).toEqual([]);
    expect(ids(s.done)).toEqual(['x']);
  });

  it('ended → done; the hero is out of rest; `open` counts it', () => {
    const s = splitToday([ENDED, RUNNING, LATER], { now: NOW, heroId: 'running' });
    expect(ids(s.done)).toEqual(['ended']);
    expect(ids(s.rest)).toEqual(['later']);
    expect(s.open).toBe(2);
    expect(s.kind).toBe('rows');
  });

  it('a lesson held early (started, no longer open) folds into done, not a row', () => {
    const s = splitToday([at('held', '11:30', 'completed'), LATER], { now: NOW, heroId: 'later' });
    expect(ids(s.done)).toEqual(['held']);
    expect(ids(s.rest)).toEqual([]);
    expect(s.open).toBe(1);
  });

  it('kinds: empty, only the hero, all ended', () => {
    expect(splitToday([], { now: NOW, heroId: null }).kind).toBe('empty');
    expect(splitToday([at('c', '14:00', 'cancelled_by_admin')], { now: NOW, heroId: null }).kind).toBe('empty');
    expect(splitToday([RUNNING], { now: NOW, heroId: 'running' }).kind).toBe('heroOnly');
    expect(splitToday([ENDED, RUNNING], { now: NOW, heroId: 'running' }).kind).toBe('heroOnly');
    expect(splitToday([ENDED], { now: NOW, heroId: null }).kind).toBe('quiet');
  });
});
