import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { dayCellLabel, dayNumber, monthTitle, weekdayHead } from './month-text';

describe('month-text', () => {
  it('names the month and the day', () => {
    expect(monthTitle('2026-11')).toMatch(/2026/);
    expect(dayNumber('2026-11-04')).toMatch(/4/);
  });

  it('gives a long and a narrow weekday head', () => {
    const head = weekdayHead('2026-11-14');
    expect(head.long.length).toBeGreaterThan(head.narrow.length);
  });

  it('says how many lessons a cell holds, or none', () => {
    expect(dayCellLabel('2026-11-14', 0)).toContain(t.teacherSchedule.noLessons);
    expect(dayCellLabel('2026-11-14', 2)).toContain(t.schedule.lessonCount.two);
  });
});
