import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { nextLessonText } from './next-lesson';
import { locale } from '@/lib/i18n/locale';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale, tz: 'Asia/Riyadh' } as const;

describe('nextLessonText', () => {
  it('names the academy-clock (Riyadh) day and time with Western digits', () => {
    const text = nextLessonText('2026-10-05T14:00:00.000Z', C24);
    expect(text).toContain('17:00');
    expect(text).toMatch(/5/);
    expect(text).not.toMatch(/[٠-٩]/);
  });

  it('says there is none when null', () => {
    expect(nextLessonText(null, C24)).toBe(t.teacherStudents.noNextLesson);
  });

  it('reads in the zone it is given', () => {
    expect(nextLessonText('2026-10-05T14:00:00.000Z', { ...C24, tz: 'UTC' })).toContain('14:00');
  });
});
