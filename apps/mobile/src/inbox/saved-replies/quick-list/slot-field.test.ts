import { replySlots } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { slotKeyboard, slotLabel } from './slot-field';

const slots = replySlots('{name} [المبلغ] [الرقم] [الرابط] [التاريخ] [الوقت] [اليوم والتاريخ] [IBAN] [ ] [ ]');

test('numbers for المبلغ / الرقم, a link keyboard for الرابط, plain text for the rest (dates too)', () => {
  expect(slots.map(slotKeyboard)).toEqual(['default', 'numeric', 'numeric', 'url', 'default', 'default', 'default', 'default', 'default', 'default']);
});

test('labels: the placeholder name, the blank as written, «قيمة n» for an empty one', () => {
  expect(slots.map(slotLabel)).toEqual([
    t.savedReplies.placeholders.name,
    'المبلغ',
    'الرقم',
    'الرابط',
    'التاريخ',
    'الوقت',
    'اليوم والتاريخ',
    'IBAN',
    t.savedReplies.fill.blank.replace('{n}', '1'),
    t.savedReplies.fill.blank.replace('{n}', '2'),
  ]);
});
