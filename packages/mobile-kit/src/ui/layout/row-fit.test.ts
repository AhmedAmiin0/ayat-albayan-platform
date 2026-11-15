import { labelWidth, rowFits } from './row-fit';

const base = { gap: 8, fontScale: 1 };

test('an unmeasured row, or a lone button, always fits', () => {
  expect(rowFits({ ...base, width: 0, labels: ['تغيير الموعد', 'إلغاء الحلقة'] })).toBe(true);
  expect(rowFits({ ...base, width: 50, labels: ['تغيير الموعد'] })).toBe(true);
});

test('two lesson actions fit side by side on a 328pt sheet at the default font scale', () => {
  expect(rowFits({ ...base, width: 328, labels: ['تغيير الموعد', 'إلغاء الحلقة'] })).toBe(true);
  expect(rowFits({ ...base, width: 328, labels: ['Reschedule', 'Cancel lesson'] })).toBe(true);
});

test('font scale 1.3 stacks what no longer fits one line in its cell', () => {
  const labels = ['Reschedule', 'Cancel lesson'];
  expect(rowFits({ ...base, width: 300, labels })).toBe(true);
  expect(rowFits({ ...base, width: 300, labels, fontScale: 1.3 })).toBe(false);
});

test('icons take room: the link block keeps two cells only while label + icon fit', () => {
  const labels = ['انسخ الرابط', 'افتح الرابط'];
  expect(rowFits({ ...base, width: 304, labels, icons: 2 })).toBe(true);
  expect(rowFits({ ...base, width: 240, labels, icons: 2 })).toBe(false);
});

test('three cells share the width: a long third label stacks the row', () => {
  expect(rowFits({ ...base, width: 328, labels: ['نعم', 'لا', 'ربما'] })).toBe(true);
  const long = ['تأكيد الحلقة', 'تغيير الموعد', 'إلغاء الحلقة'];
  expect(rowFits({ ...base, width: 328, labels: long })).toBe(false);
});

test('labelWidth grows with the font scale, an unknown label counts as 14 letters', () => {
  expect(labelWidth('Copy link', 1.3)).toBeGreaterThan(labelWidth('Copy link', 1));
  expect(labelWidth(null, 1)).toBeCloseTo(14 * 0.52 * 15 + 26);
});

test('Arabic marks take no width: «عدّل الوقت | غيّر الموعد | إلغاء» fits a 360pt phone', () => {
  expect(labelWidth('عدّل', 1)).toBeCloseTo(labelWidth('عدل', 1));
  const admin = ['عدّل الوقت', 'غيّر الموعد', 'إلغاء'];
  expect(rowFits({ ...base, width: 328, labels: admin })).toBe(true);
});
