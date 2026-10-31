import { describe, expect, it } from 'vitest';
import { noticeTemplate, noticeWhen, oneLine } from './notice-text';
import { AT, FROM, notice } from './schedule-notices.fakes';

const to = { name: 'أ. فاطمة', tz: 'Asia/Riyadh', names: ['سهيلة'], at: AT };

describe('noticeWhen: the time in the recipient’s own zone (rule 6)', () => {
  it('reads «الاثنين 2 نوفمبر، 11:00 ص» in Riyadh and the same instant in London', () => {
    expect(noticeWhen(AT, 'Asia/Riyadh')).toBe('الاثنين 2 نوفمبر، 11:00 ص');
    expect(noticeWhen(AT, 'Europe/London')).toBe('الاثنين 2 نوفمبر، 8:00 ص');
  });
});

describe('noticeTemplate: the four bodies’ positional params', () => {
  it('lesson_rescheduled: {{1}} recipient, {{2}} student, {{3}} the old time, {{4}} the new', () => {
    const t = noticeTemplate(notice({ key: 'lesson_rescheduled', from: FROM }), to);
    expect(t).toEqual({
      key: 'lesson_rescheduled',
      params: { '1': 'أ. فاطمة', '2': 'سهيلة', '3': 'الأحد 1 نوفمبر، 6:00 م', '4': 'الاثنين 2 نوفمبر، 11:00 ص' },
    });
  });

  it.each(['lesson_cancelled', 'course_paused', 'course_resumed'] as const)('%s: {{3}} the time', (key) => {
    expect(noticeTemplate(notice({ key }), to)?.params).toEqual({
      '1': 'أ. فاطمة',
      '2': 'سهيلة',
      '3': 'الاثنين 2 نوفمبر، 11:00 ص',
    });
  });

  it('siblings are joined; params never carry a newline, a tab or a run of spaces', () => {
    const t = noticeTemplate(notice(), { ...to, name: 'أم\nسهيلة', names: ['سهيلة', 'مريم\t  الصغيرة'] });
    expect(t?.params['1']).toBe('أم سهيلة');
    expect(t?.params['2']).toBe('سهيلة ومريم الصغيرة');
    for (const v of Object.values(t?.params ?? {})) expect(String(v)).not.toMatch(/\n|\t| {4}/);
  });

  it('an empty name (Meta refuses an empty param) → no template', () => {
    expect(noticeTemplate(notice(), { ...to, name: '  ' })).toBeNull();
    expect(noticeTemplate(notice(), { ...to, names: [' '] })).toBeNull();
  });

  it('oneLine folds whitespace', () => {
    expect(oneLine('  a \n b  ')).toBe('a b');
  });
});
