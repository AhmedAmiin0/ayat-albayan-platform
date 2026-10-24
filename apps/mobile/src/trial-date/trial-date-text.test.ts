import { lessonWhenText } from '@ab/shared';
import { t } from '@/lib/i18n';
import { historyOf, OLD, THU_1_18, trialRow } from './fixtures';
import { countText, effectLine, pickedLine, warnLine, whenLines } from './trial-date-text';

test('the warning starts with the 3rd date (two exist), never before', () => {
  expect(warnLine(0)).toBeNull();
  expect(warnLine(1)).toBeNull();
  expect(warnLine(2)).toBe(t.trialDate.warn.replace('{n}', '3'));
  expect(warnLine(5)).toBe(t.trialDate.warn.replace('{n}', '6'));
});

test('the viewer’s clock, and the family’s only when it differs', () => {
  const riyadh = lessonWhenText(new Date(THU_1_18), 'Asia/Riyadh', 'ar');
  expect(whenLines(THU_1_18, 'Asia/Riyadh')).toEqual({ when: riyadh, family: null });
  const cairo = lessonWhenText(new Date(THU_1_18), 'Africa/Cairo', 'ar');
  expect(whenLines(THU_1_18, 'Africa/Cairo')).toEqual({ when: riyadh, family: t.trialDate.familyTime.replace('{time}', cairo) });
});

test('who picked it and when; an imported row says «غير معروف»', () => {
  const when = lessonWhenText(new Date('2026-09-28T09:00:00.000Z'), 'Asia/Riyadh', 'ar');
  expect(pickedLine(trialRow())).toBe(t.trialDate.pickedAt.replace('{name}', 'فاطمة').replace('{when}', when));
  expect(pickedLine(trialRow({ picked_by: null }))).toContain(t.trialDate.unknownPicker);
});

test('the effect: moves the upcoming trial (its time), or books a new lesson', () => {
  const when = lessonWhenText(new Date(THU_1_18), 'Asia/Riyadh', 'ar');
  expect(effectLine(historyOf([trialRow()]))).toBe(t.trialDate.moves.replace('{when}', when));
  expect(effectLine(historyOf([trialRow({ lesson_id: OLD, outcome: 'absent' })]))).toBe(t.trialDate.newLesson);
});

test('the count speaks Arabic plurals', () => {
  expect(countText(1)).toBe(t.trialDate.count.one);
  expect(countText(2)).toBe(t.trialDate.count.two);
  expect(countText(3)).toBe(t.trialDate.count.few.replace('{n}', '3'));
});
