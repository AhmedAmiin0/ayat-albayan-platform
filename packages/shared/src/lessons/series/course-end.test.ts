import { describe, expect, it } from 'vitest';
import { courseEndsOn, daysBetween, timeGroups } from './day-times.js';

const groups = (byday: number[], dayTimes: { weekday: number; startTimeLocal: string }[] = []) =>
  timeGroups({ byday, startTimeLocal: '17:00', dayTimes });

describe('courseEndsOn: the local date of the N-th lesson over every group', () => {
  it('8 lessons on Sun 17:00 + Tue 19:30 from a Sunday: the 4th Tuesday', () => {
    const end = courseEndsOn({ groups: groups([0, 2], [{ weekday: 2, startTimeLocal: '19:30' }]), startsOn: '2026-10-18', lessonsTotal: 8 });
    expect(end).toBe('2026-11-10');
  });
  it.each([
    [4, [3]],
    [8, [0, 6]],
    [12, [1, 3, 5]],
    [16, [0, 1, 2, 3]],
    [20, [0, 1, 2, 3, 4]],
    [28, [0, 1, 2, 3, 4, 5, 6]],
  ])('a %i package with exactly its days a week ends within start + 27 days', (total, byday) => {
    const startsOn = '2026-10-18';
    const end = courseEndsOn({ groups: groups(byday), startsOn, lessonsTotal: total });
    expect(end).not.toBeNull();
    expect(daysBetween(startsOn, end ?? '')).toBeLessThanOrEqual(27);
    expect(daysBetween(startsOn, end ?? '')).toBeGreaterThanOrEqual(21);
  });
  it('the last picked weekday of week 4 is start + 27 for a Sun + Sat course', () => {
    expect(courseEndsOn({ groups: groups([0, 6]), startsOn: '2026-10-18', lessonsTotal: 8 })).toBe('2026-11-14');
  });
  it('a custom count (10 lessons twice a week) ends on the 5th week', () => {
    expect(courseEndsOn({ groups: groups([0, 3]), startsOn: '2026-10-18', lessonsTotal: 10 })).toBe('2026-11-18');
  });
  it('a DST change inside the course does not move the local dates (Cairo, 30 Oct 2026)', () => {
    const end = courseEndsOn({ groups: groups([4, 5]), startsOn: '2026-10-22', lessonsTotal: 8 });
    expect(end).toBe('2026-11-13');
  });
  it('a start between the picked weekdays counts from the first one on or after it', () => {
    expect(courseEndsOn({ groups: groups([0]), startsOn: '2026-10-20', lessonsTotal: 2 })).toBe('2026-11-01');
  });
  it('no days or no lessons → null', () => {
    expect(courseEndsOn({ groups: [], startsOn: '2026-10-18', lessonsTotal: 8 })).toBeNull();
    expect(courseEndsOn({ groups: groups([0]), startsOn: '2026-10-18', lessonsTotal: 0 })).toBeNull();
  });
});
