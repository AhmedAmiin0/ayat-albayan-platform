import { expect, it } from 'vitest';
import { replayedOther } from './unconfirmed.js';

// «تعديل» = a correction (owner 2026-11-07): the API sends «تصحيح: » + the text, so the row's body
// is the prefix then the typed text; the prefix may be reworded by the admins.
it('a correction is a replay only when its row does not end with the text sent', () => {
  expect(replayedOther({ body: 'تصحيح: الساعة الخامسة' }, 'الساعة الخامسة', true)).toBe(false);
  expect(replayedOther({ body: 'تنبيه: الساعة الخامسة ' }, ' الساعة الخامسة', true)).toBe(false);
  expect(replayedOther({ body: 'تصحيح: الساعة الرابعة' }, 'الساعة الخامسة', true)).toBe(true);
  expect(replayedOther({ body: null }, 'الساعة الخامسة', true)).toBe(true);
});

it('a plain text keeps the exact rule: the prefixed body is another message', () => {
  expect(replayedOther({ body: 'تصحيح: الساعة الخامسة' }, 'الساعة الخامسة')).toBe(true);
});
