import { t } from '@/lib/i18n';
import { durationText, sizeText, teacherLabel } from './recording-format';

const R = t.mobileStudentFile.recordings;

test('duration: minutes:seconds, hours when needed, unknown while running', () => {
  expect(durationText(750)).toBe('12:30');
  expect(durationText(3725)).toBe('1:02:05');
  expect(durationText(5)).toBe('0:05');
  expect(durationText(null)).toBe(R.unknown);
});

test('size: whole megabytes (at least 1), gigabytes with one decimal, unknown', () => {
  expect(sizeText(48 * 1024 * 1024)).toBe(R.sizeMb.replace('{n}', '48'));
  expect(sizeText(10)).toBe(R.sizeMb.replace('{n}', '1'));
  expect(sizeText(1.2 * 1024 ** 3)).toBe(R.sizeGb.replace('{n}', '1.2'));
  expect(sizeText(null)).toBe(R.unknown);
});

test('teacher label falls back to the Arabic name', () => {
  expect(teacherLabel({ display_name_ar: 'أبرار', display_name_en: null })).toBe('أبرار');
});
