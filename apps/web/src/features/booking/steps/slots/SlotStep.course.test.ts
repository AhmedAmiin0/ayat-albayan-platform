import { pickProgress } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { emptyDraft } from '../../draft/draft';
import { packageDaysNote } from '../package/package-days';
import { daysNote } from './SlotDays';
import { courseNear } from './SlotStep';

const COURSE = { perWeek: 2, lessonsTotal: 8, package: '8' as const, startsOn: '2026-10-20' };

describe('the course’s slot step (owner 2026-10-18)', () => {
  it('opens the grid near the subscription’s start, never before now', () => {
    const now = new Date('2026-10-03T09:00:00.000Z');
    expect(courseNear('2026-10-20', now)).toBe('2026-10-20T12:00:00.000Z');
    expect(courseNear('2026-09-01', now)).toBe(now.toISOString());
  });

  it('the course shows how many days are left or too many; the admin keeps the package note', () => {
    const course = { ...emptyDraft(), course: COURSE };
    expect(daysNote(course, 1)).toBe(pickProgress(t.booking, 1, 2));
    expect(daysNote(course, 3)).toBe(pickProgress(t.booking, 3, 2));
    expect(daysNote(course, 2)).toBeNull();
    expect(daysNote(emptyDraft(), 1)).toBe(packageDaysNote('8', 1));
  });
});
