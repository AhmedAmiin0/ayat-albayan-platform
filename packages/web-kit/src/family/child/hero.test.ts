import { describe, expect, it } from 'vitest';
import { lesson } from '@ab/web-kit/portal/portal.fixtures';
import { heroDate } from './hero-date';
import { heroTeacher } from './hero-teacher';

const NOW = new Date('2026-10-27T15:00:00.000Z');
const report = (name: string) => ({
  id: 'r1', lesson_id: 'h1', lesson_starts_at: null, sent_at: '2026-10-20T17:00:00.000Z',
  teacher: { display_name_ar: name, display_name_en: null }, recording_id: null,
});

describe('the hero’s teacher', () => {
  it('the next lesson’s teacher first', () => {
    const reads = { lessons: { lessons: [lesson()] }, reports: { reports: [report('Huda')] } };
    expect(heroTeacher(reads, NOW)?.display_name_ar).toBe('أبرار');
  });

  it('no lesson ahead: the newest report’s; neither: none, never a guess', () => {
    const over = lesson({ status: 'cancelled_by_teacher' });
    expect(heroTeacher({ lessons: { lessons: [over] }, reports: { reports: [report('Huda')] } }, NOW)
      ?.display_name_ar).toBe('Huda');
    expect(heroTeacher({}, NOW)).toBeNull();
    expect(heroTeacher({ reports: { reports: [report('')] } }, NOW)).toBeNull();
  });
});

describe('the hero’s date', () => {
  it('today on the student’s clock, then the Hijri date', () => {
    const text = heroDate(NOW, { tz: 'Asia/Riyadh', locale: 'ar' });
    expect(text.startsWith('الثلاثاء، 27 أكتوبر')).toBe(true);
    expect(text).toContain(' · ');
    expect(text).toContain('1448');
  });
});
